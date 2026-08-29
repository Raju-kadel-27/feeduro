import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { getHubSpotDealById, getHubSpotPortalInfo, parseHubSpotDealInput } from "@features/internal/integrations/hubspot/server/client";
import { hubspotOAuth } from "@features/internal/integrations/hubspot/server/oauth";
import type { HubSpotSettings } from "@features/internal/integrations/hubspot/server/schemas";
import {
  getIntegration,
  getOrgSlugFromId,
  parseSettings,
} from "@features/internal/integrations/server/queries";
import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import { z } from "zod";
import type { Db } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";

const CALLBACK_PATH = "/api/oauth2/integrations/hubspot";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

// GET /oauth2/integrations/hubspot?intent=connect → OAuth redirect
// GET /oauth2/integrations/hubspot?code=...&state=... → OAuth callback
export async function handleHubSpotLoader(db: Db, request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(db, request);
    const env = getEnv();
    if (!env.HUBSPOT_CLIENT_ID || !env.HUBSPOT_CLIENT_SECRET) {
      throw new Response("HubSpot OAuth not configured", { status: 501 });
    }

    const oauthState = buildOAuthState(organizationId);
    return redirect(buildAuthUrl(hubspotOAuth, env.HUBSPOT_CLIENT_ID, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const env = getEnv();
    if (!env.HUBSPOT_CLIENT_ID || !env.HUBSPOT_CLIENT_SECRET) return redirect("/");

    const { orgId } = parsed;

    try {
      const { accessToken } = await exchangeCode(
        hubspotOAuth,
        code,
        env.HUBSPOT_CLIENT_ID,
        env.HUBSPOT_CLIENT_SECRET,
        callbackUrl(),
      );

      const portalInfo = await getHubSpotPortalInfo(accessToken);

      const existing = await getIntegration(db, orgId, "hubspot");
      const existingSettings = parseSettings<HubSpotSettings>(existing?.settings ?? null);

      const settings: HubSpotSettings = {
        portalId: portalInfo?.portalId,
        hubDomain: portalInfo?.hubDomain,
        autoCreateDeals: existingSettings?.autoCreateDeals ?? false,
      };

      await db
        .insert(integrations)
        .values({
          organizationId: orgId,
          provider: "hubspot",
          accessToken,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: { accessToken, settings: JSON.stringify(settings), updatedAt: new Date() },
        });
    } catch {
      // Redirect even on error — UI will show "not connected"
    }

    const orgSlug = await getOrgSlugFromId(db, orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/hubspot` : "/");
  }

  return redirect("/");
}

const hubspotActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("update_settings"), autoCreateDeals: z.boolean() }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({ intent: z.literal("link_deal"), postId: z.string().min(1), dealInput: z.string().min(1) }),
  z.object({ intent: z.literal("unlink_deal"), postId: z.string().min(1) }),
]);

export async function handleHubSpotAction(db: Db, request: Request) {
  const { session, organizationId } = await requireOrganization(db, request);
  await requirePermission(db, organizationId, session.user.id, { integrations: ["update"] });

  const parsed = hubspotActionSchema.safeParse(await request.json());
  if (!parsed.success)
    return data({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.intent === "update_settings") {
    const integration = await getIntegration(db, organizationId, "hubspot");
    if (!integration?.accessToken)
      return data({ error: "HubSpot not connected" }, { status: 400 });
    const existing = parseSettings<HubSpotSettings>(integration.settings ?? null);
    if (!existing) return data({ error: "Invalid settings" }, { status: 400 });
    await db
      .update(integrations)
      .set({
        settings: JSON.stringify({ ...existing, autoCreateDeals: parsed.data.autoCreateDeals }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "hubspot")),
      );
    return data({ success: true });
  }

  if (parsed.data.intent === "disconnect") {
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "hubspot")),
      );
    return data({ success: true });
  }

  if (parsed.data.intent === "link_deal") {
    const { postId, dealInput } = parsed.data;
    const dealId = parseHubSpotDealInput(dealInput);
    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "hubspot"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);
    if (!integration?.accessToken) return data({ error: "HubSpot not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    const settings = parseSettings<HubSpotSettings>(integration.settings ?? null);
    try {
      const deal = await getHubSpotDealById(integration.accessToken, dealId, settings?.portalId);
      await db
        .insert(postExternalLinks)
        .values({
          postId,
          organizationId,
          provider: "hubspot",
          externalId: deal.id,
          externalUrl: deal.dealUrl,
          identifier: deal.id,
          externalTitle: deal.dealname,
          externalStatus: deal.dealstage,
          linkedByUserId: session.user.id,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [postExternalLinks.postId, postExternalLinks.provider],
          set: {
            externalId: deal.id,
            externalUrl: deal.dealUrl,
            identifier: deal.id,
            externalTitle: deal.dealname,
            externalStatus: deal.dealstage,
            lastSyncedAt: new Date(),
          },
        });
      return data({ success: true, deal });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to link deal" }, { status: 400 });
    }
  }

  if (parsed.data.intent === "unlink_deal") {
    const { postId } = parsed.data;
    await db
      .delete(postExternalLinks)
      .where(and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "hubspot"), eq(postExternalLinks.organizationId, organizationId)));
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
