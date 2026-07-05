import { requireOrganization } from "@features/auth/server/guards";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { data, redirect } from "react-router";
import type { Db } from "@/db";
import { getOrgSlugFromId, upsertNotificationSettings } from "../../server/queries";

const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const CALLBACK_PATH = "/api/oauth/slack/callback";

function callbackUrl(): string {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

function requireEnv() {
  const env = getEnv();
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new Response("Slack OAuth not configured", { status: 501 });
  }
  return { clientId: env.SLACK_CLIENT_ID, clientSecret: env.SLACK_CLIENT_SECRET };
}

function buildSlackAuthUrl(clientId: string, redirectUri: string, state: string): string {
  return `${SLACK_AUTHORIZE_URL}?${new URLSearchParams({
    client_id: clientId,
    scope: "incoming-webhook",
    redirect_uri: redirectUri,
    state,
  })}`;
}

async function exchangeSlackCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ webhookUrl: string; channel: string | null } | null> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ code, redirect_uri: redirectUri }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  if (!json.ok) return null;
  const incomingWebhook = json.incoming_webhook as { url?: string; channel?: string } | undefined;
  if (!incomingWebhook?.url) return null;
  return { webhookUrl: incomingWebhook.url, channel: incomingWebhook.channel ?? null };
}

// GET /api/slack?intent=connect
export async function handleSlackConnect(db: Db, request: Request) {
  const { organizationId } = await requireOrganization(db, request);
  const { clientId } = requireEnv();
  const oauthState = buildOAuthState(organizationId);
  return redirect(buildSlackAuthUrl(clientId, callbackUrl(), oauthState));
}

// GET /api/oauth2/slack/callback?code=...&state=...
export async function handleSlackCallback(db: Db, request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !(code && state)) return redirect("/");

  const parsed = parseOAuthState(state);
  if (!parsed) return redirect("/");

  const { clientId, clientSecret } = requireEnv();
  try {
    const result = await exchangeSlackCode(code, clientId, clientSecret, callbackUrl());
    if (result) {
      await upsertNotificationSettings(db, parsed.orgId, {
        slackWebhookUrl: result.webhookUrl,
        slackChannel: result.channel,
      });
    }
  } catch {
    // ignore — UI will show disconnected
  }

  const orgSlug = await getOrgSlugFromId(db, parsed.orgId);
  return redirect(orgSlug ? `/${orgSlug}/settings/integrations` : "/");
}

// POST /api/slack  intent=disconnect
export async function handleSlackAction(db: Db, request: Request) {
  const { organizationId } = await requireOrganization(db, request);
  const form = Object.fromEntries(await request.formData());

  if (form.intent === "disconnect") {
    await upsertNotificationSettings(db, organizationId, {
      slackWebhookUrl: null,
      slackChannel: null,
    });
    return data({ ok: true });
  }

  return data({ ok: false }, { status: 400 });
}
