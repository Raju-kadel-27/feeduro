import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import {
  getIntegration,
  getOrgSlugFromId,
  parseSettings,
} from "@features/internal/integrations/server/queries";
import { getZendeskCurrentUser } from "@features/internal/integrations/zendesk/server/client";
import { zendeskOAuth } from "@features/internal/integrations/zendesk/server/oauth";
import type { ZendeskSettings } from "@features/internal/integrations/zendesk/server/schemas";
import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import { z } from "zod";
import { getDb } from "@/db";
import { integrations, member } from "@/db/schema";
import type { Route } from "./+types/zendesk";

const CALLBACK_PATH = "/api/zendesk";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

function buildZendeskState(orgId: string, subdomain: string): string {
  const payload = JSON.stringify({ orgId, subdomain, ts: Date.now() });
  return btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function parseZendeskState(state: string): { orgId: string; subdomain: string } | null {
  try {
    const padded = state.replace(/-/g, "+").replace(/_/g, "/");
    const rem = padded.length % 4;
    const decoded = atob(rem ? padded + "=".repeat(4 - rem) : padded);
    const d = JSON.parse(decoded) as { orgId?: string; subdomain?: string; ts?: number };
    if (!d.orgId || !d.subdomain) return null;
    if (typeof d.ts === "number" && Date.now() - d.ts > 15 * 60 * 1000) return null;
    return { orgId: d.orgId, subdomain: d.subdomain };
  } catch {
    return null;
  }
}

// GET /api/zendesk?intent=connect&subdomain=xyz  → OAuth redirect
// GET /api/zendesk?code=...&state=...            → OAuth callback
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const subdomain = url.searchParams.get("subdomain")?.trim().toLowerCase();
    if (!subdomain) throw new Response("subdomain is required", { status: 400 });

    const { organizationId } = await requireOrganization(request);
    const env = getEnv();
    if (!env.ZENDESK_CLIENT_ID || !env.ZENDESK_CLIENT_SECRET) {
      throw new Response("Zendesk OAuth not configured", { status: 501 });
    }

    const oauthState = buildZendeskState(organizationId, subdomain);
    return redirect(
      buildAuthUrl(zendeskOAuth(subdomain), env.ZENDESK_CLIENT_ID, callbackUrl(), oauthState),
    );
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseZendeskState(state);
    if (!parsed) return redirect("/");

    const env = getEnv();
    if (!env.ZENDESK_CLIENT_ID || !env.ZENDESK_CLIENT_SECRET) return redirect("/");

    const { orgId, subdomain } = parsed;

    try {
      const { accessToken } = await exchangeCode(
        zendeskOAuth(subdomain),
        code,
        env.ZENDESK_CLIENT_ID,
        env.ZENDESK_CLIENT_SECRET,
        callbackUrl(),
      );

      const user = await getZendeskCurrentUser(accessToken, subdomain);

      const db = getDb();
      const existing = await getIntegration(orgId, "zendesk");
      const existingSettings = parseSettings<ZendeskSettings>(existing?.settings ?? null);

      const settings: ZendeskSettings = {
        subdomain,
        accountName: user?.name ?? undefined,
        autoCreateTickets: existingSettings?.autoCreateTickets ?? false,
      };

      await db
        .insert(integrations)
        .values({
          organizationId: orgId,
          provider: "zendesk",
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
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/zendesk` : "/");
  }

  return data({});
}

const actionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("update_settings"),
    autoCreateTickets: z.boolean(),
  }),
  z.object({ intent: z.literal("disconnect") }),
]);

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  await requirePermission(organizationId, session.user.id, { settings: ["update"] });

  const raw = await request.json();
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const db = getDb();

  if (parsed.data.intent === "update_settings") {
    const integration = await getIntegration(organizationId, "zendesk");
    if (!integration?.accessToken) {
      return data({ error: "Zendesk not connected" }, { status: 400 });
    }

    const existing = parseSettings<ZendeskSettings>(integration.settings ?? null);
    if (!existing) return data({ error: "Invalid settings" }, { status: 400 });

    const updated: ZendeskSettings = {
      ...existing,
      autoCreateTickets: parsed.data.autoCreateTickets,
    };

    await db
      .update(integrations)
      .set({ settings: JSON.stringify(updated), updatedAt: new Date() })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "zendesk")),
      );

    return data({ success: true });
  }

  if (parsed.data.intent === "disconnect") {
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "zendesk")),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
