import { requireOrganization } from "@features/auth/server/guards";
import { buildAuthUrl } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { data, redirect } from "react-router";
import type { Db } from "@/db";
import { getOrgSlugFromId, upsertNotificationSettings } from "../../server/queries";

const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const CALLBACK_PATH = "/api/oauth2/integrations/discord";

function callbackUrl(): string {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

function requireEnv() {
  const env = getEnv();
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    throw new Response("Discord OAuth not configured", { status: 501 });
  }
  return { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET };
}

async function exchangeDiscordCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ webhookUrl: string; channelId: string | null } | null> {
  const res = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  if (json.error) return null;
  const webhook = json.webhook as { url?: string; channel_id?: string } | undefined;
  if (!webhook?.url) return null;
  return { webhookUrl: webhook.url, channelId: webhook.channel_id ?? null };
}

// GET /api/oauth2/integrations/discord?intent=connect OR ?code=...&state=...
export async function handleDiscordLoader(db: Db, request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  return intent === "connect"
    ? handleDiscordConnect(db, request)
    : handleDiscordCallback(db, request);
}

// GET /api/oauth2/integrations/discord?intent=connect
export async function handleDiscordConnect(db: Db, request: Request) {
  const { organizationId } = await requireOrganization(db, request);
  const { clientId } = requireEnv();
  const oauthState = buildOAuthState(organizationId);
  return redirect(
    buildAuthUrl(
      {
        authorizeUrl: DISCORD_AUTHORIZE_URL,
        tokenUrl: DISCORD_TOKEN_URL,
        scopes: "webhook.incoming",
        bodyFormat: "form",
      },
      clientId,
      callbackUrl(),
      oauthState,
    ),
  );
}

// GET /api/oauth2/discord/callback?code=...&state=...
export async function handleDiscordCallback(db: Db, request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !(code && state)) return redirect("/");

  const parsed = parseOAuthState(state);
  if (!parsed) return redirect("/");

  const { clientId, clientSecret } = requireEnv();
  try {
    const result = await exchangeDiscordCode(code, clientId, clientSecret, callbackUrl());
    if (result) {
      await upsertNotificationSettings(db, parsed.orgId, {
        discordWebhookUrl: result.webhookUrl,
        discordChannelId: result.channelId,
      });
    }
  } catch {
    // ignore — UI will show disconnected
  }

  const orgSlug = await getOrgSlugFromId(db, parsed.orgId);
  return redirect(orgSlug ? `/${orgSlug}/settings/integrations` : "/");
}

// POST /api/discord  intent=disconnect
export async function handleDiscordAction(db: Db, request: Request) {
  const { organizationId } = await requireOrganization(db, request);
  const form = Object.fromEntries(await request.formData());

  if (form.intent === "disconnect") {
    await upsertNotificationSettings(db, organizationId, {
      discordWebhookUrl: null,
      discordChannelId: null,
    });
    return data({ ok: true });
  }

  return data({ ok: false }, { status: 400 });
}
