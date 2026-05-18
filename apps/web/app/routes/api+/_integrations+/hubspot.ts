import { requireOrganization } from "@features/auth/server/guards";
import { getHubSpotPortalInfo } from "@features/integrations/hubspot/server/client";
import { hubspotOAuth } from "@features/integrations/hubspot/server/oauth";
import type { HubSpotSettings } from "@features/integrations/hubspot/server/schemas";
import {
  getIntegration,
  getOrgSlugFromId,
  parseSettings,
} from "@features/integrations/server/queries";
import { isAdmin } from "@features/roles/server/queries";
import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import { z } from "zod";
import { getDb } from "@/db";
import { integrations, member } from "@/db/schema";
import type { Route } from "./+types/hubspot";

const CALLBACK_PATH = "/api/hubspot";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

// GET /api/hubspot?intent=connect  → OAuth redirect
// GET /api/hubspot?code=...&state=... → OAuth callback
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(request);
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

      const db = getDb();
      const existing = await getIntegration(orgId, "hubspot");
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

    const orgSlug = await getOrgSlugFromId(orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/hubspot` : "/");
  }

  return data({});
}

const actionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("update_settings"),
    autoCreateDeals: z.boolean(),
  }),
  z.object({ intent: z.literal("disconnect") }),
]);

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  if (!(await isAdmin(organizationId, session.user.id))) {
    return data({ error: "Only admins can manage integrations" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const db = getDb();

  if (parsed.data.intent === "update_settings") {
    const integration = await getIntegration(organizationId, "hubspot");
    if (!integration?.accessToken) {
      return data({ error: "HubSpot not connected" }, { status: 400 });
    }

    const existing = parseSettings<HubSpotSettings>(integration.settings ?? null);
    if (!existing) return data({ error: "Invalid settings" }, { status: 400 });

    const updated: HubSpotSettings = {
      ...existing,
      autoCreateDeals: parsed.data.autoCreateDeals,
    };

    await db
      .update(integrations)
      .set({ settings: JSON.stringify(updated), updatedAt: new Date() })
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

  return data({ error: "Unknown intent" }, { status: 400 });
}
