import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { getSalesforceUserInfo } from "@features/internal/integrations/salesforce/server/client";
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
import { integrations, member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/salesforce";

const CALLBACK_PATH = "/api/salesforce";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

// GET /api/salesforce?intent=connect  → OAuth redirect
// GET /api/salesforce?code=...&state=... → OAuth callback
export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
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

  return data({});
}

const actionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("update_settings"),
    autoCreateOpportunities: z.boolean(),
  }),
  z.object({ intent: z.literal("disconnect") }),
]);

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  await requirePermission(db, organizationId, session.user.id, { settings: ["update"] });

  const raw = await request.json();
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.intent === "update_settings") {
    const integration = await getIntegration(db, organizationId, "salesforce");
    if (!integration?.accessToken) {
      return data({ error: "Salesforce not connected" }, { status: 400 });
    }

    const existing = parseSettings<SalesforceSettings>(integration.settings ?? null);
    if (!existing) return data({ error: "Invalid settings" }, { status: 400 });

    const updated: SalesforceSettings = {
      ...existing,
      autoCreateOpportunities: parsed.data.autoCreateOpportunities,
    };

    await db
      .update(integrations)
      .set({ settings: JSON.stringify(updated), updatedAt: new Date() })
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.provider, "salesforce"),
        ),
      );

    return data({ success: true });
  }

  if (parsed.data.intent === "disconnect") {
    await db
      .delete(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.provider, "salesforce"),
        ),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
