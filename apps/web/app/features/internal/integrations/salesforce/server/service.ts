import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { getSalesforceOpportunityById, getSalesforceUserInfo, parseSalesforceOpportunityInput } from "@features/internal/integrations/salesforce/server/client";
import {
  exchangeSalesforceCode,
  salesforceAuthUrl,
} from "@features/internal/integrations/salesforce/server/oauth";
import type { SalesforceSettings } from "@features/internal/integrations/salesforce/server/schemas";
import {
  getIntegration,
  getOrgSlugFromId,
  parseSettings,
} from "@features/internal/integrations/server/queries";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import { z } from "zod";
import type { Db } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";

const CALLBACK_PATH = "/api/oauth2/integrations/salesforce";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

// GET /oauth2/integrations/salesforce?intent=connect → initiates OAuth
// GET /oauth2/integrations/salesforce?code=...&state=... → OAuth callback
export async function handleSalesforceLoader(db: Db, request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(db, request);
    const env = getEnv();
    if (!env.SALESFORCE_CLIENT_ID || !env.SALESFORCE_CLIENT_SECRET) {
      throw new Response("Salesforce OAuth not configured", { status: 501 });
    }

    const oauthState = buildOAuthState(organizationId);
    return redirect(salesforceAuthUrl(env.SALESFORCE_CLIENT_ID, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const env = getEnv();
    if (!env.SALESFORCE_CLIENT_ID || !env.SALESFORCE_CLIENT_SECRET) return redirect("/");

    const { orgId } = parsed;

    try {
      const tokenData = await exchangeSalesforceCode(
        code,
        env.SALESFORCE_CLIENT_ID,
        env.SALESFORCE_CLIENT_SECRET,
        callbackUrl(),
      );

      const userInfo = await getSalesforceUserInfo(tokenData.id, tokenData.access_token);

      const existing = await getIntegration(db, orgId, "salesforce");
      const existingSettings = parseSettings<SalesforceSettings>(existing?.settings ?? null);

      const settings: SalesforceSettings = {
        instanceUrl: tokenData.instance_url,
        organizationId: userInfo?.organization_id,
        displayName: userInfo?.display_name,
        autoCreateOpportunities: existingSettings?.autoCreateOpportunities ?? false,
      };

      await db
        .insert(integrations)
        .values({
          organizationId: orgId,
          provider: "salesforce",
          accessToken: tokenData.access_token,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: {
            accessToken: tokenData.access_token,
            settings: JSON.stringify(settings),
            updatedAt: new Date(),
          },
        });
    } catch {
      // Redirect even on error — UI will show "not connected"
    }

    const orgSlug = await getOrgSlugFromId(db, orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/salesforce` : "/");
  }

  return redirect("/");
}

const salesforceActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("update_settings"), autoCreateOpportunities: z.boolean() }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({ intent: z.literal("link_opportunity"), postId: z.string().min(1), opportunityInput: z.string().min(1) }),
  z.object({ intent: z.literal("unlink_opportunity"), postId: z.string().min(1) }),
]);

export async function handleSalesforceAction(db: Db, request: Request) {
  const { session, organizationId } = await requireOrganization(db, request);
  await requirePermission(db, organizationId, session.user.id, { integrations: ["update"] });

  const parsed = salesforceActionSchema.safeParse(await request.json());
  if (!parsed.success)
    return data({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.intent === "update_settings") {
    const integration = await getIntegration(db, organizationId, "salesforce");
    if (!integration?.accessToken)
      return data({ error: "Salesforce not connected" }, { status: 400 });
    const existing = parseSettings<SalesforceSettings>(integration.settings ?? null);
    if (!existing) return data({ error: "Invalid settings" }, { status: 400 });
    await db
      .update(integrations)
      .set({
        settings: JSON.stringify({ ...existing, autoCreateOpportunities: parsed.data.autoCreateOpportunities }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "salesforce")),
      );
    return data({ success: true });
  }

  if (parsed.data.intent === "disconnect") {
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "salesforce")),
      );
    return data({ success: true });
  }

  if (parsed.data.intent === "link_opportunity") {
    const { postId, opportunityInput } = parsed.data;
    const opportunityId = parseSalesforceOpportunityInput(opportunityInput);
    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "salesforce"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);
    if (!integration?.accessToken) return data({ error: "Salesforce not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    const settings = parseSettings<SalesforceSettings>(integration.settings ?? null);
    if (!settings?.instanceUrl) return data({ error: "Salesforce instance URL missing" }, { status: 400 });
    try {
      const opp = await getSalesforceOpportunityById(integration.accessToken, settings.instanceUrl, opportunityId);
      await db
        .insert(postExternalLinks)
        .values({
          postId,
          organizationId,
          provider: "salesforce",
          externalId: opp.id,
          externalUrl: opp.opportunityUrl,
          identifier: opp.id.slice(0, 8),
          externalTitle: opp.name,
          externalStatus: opp.stageName,
          linkedByUserId: session.user.id,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [postExternalLinks.postId, postExternalLinks.provider],
          set: {
            externalId: opp.id,
            externalUrl: opp.opportunityUrl,
            identifier: opp.id.slice(0, 8),
            externalTitle: opp.name,
            externalStatus: opp.stageName,
            lastSyncedAt: new Date(),
          },
        });
      return data({ success: true, opportunity: opp });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to link opportunity" }, { status: 400 });
    }
  }

  if (parsed.data.intent === "unlink_opportunity") {
    const { postId } = parsed.data;
    await db
      .delete(postExternalLinks)
      .where(and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "salesforce"), eq(postExternalLinks.organizationId, organizationId)));
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
