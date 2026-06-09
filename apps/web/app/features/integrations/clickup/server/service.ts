import { requireOrganization } from "@features/auth/server/guards";
import { buildAuthUrl } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { data, redirect } from "react-router";
import { getDb } from "@/db";
import { integrations } from "@/db/schema";
import { requireAdminRole } from "../../server/permissions";
import { getIntegration, getOrgSlugFromId, parseSettings } from "../../server/queries";
import { clickupOAuth, exchangeClickupCode } from "./oauth";
import { ClickupActionSchema, type ClickupSettings } from "./schemas";
import { handleClickupConfigAction } from "./service-settings";
import { handleClickupTaskAction } from "./service-tasks";

const CALLBACK_PATH = "/api/clickup";
const LOG = "[clickup-service]";

function requireClickupEnv() {
  const env = getEnv();
  if (!env.CLICKUP_CLIENT_ID || !env.CLICKUP_CLIENT_SECRET) {
    throw new Response("ClickUp OAuth not configured", { status: 501 });
  }
  return { clientId: env.CLICKUP_CLIENT_ID, clientSecret: env.CLICKUP_CLIENT_SECRET };
}

export async function handleClickupLoader(request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(request);
    const { clientId } = requireClickupEnv();
    const oauthState = buildOAuthState(organizationId);
    return redirect(buildAuthUrl(clickupOAuth, clientId, `${getBaseUrl()}${CALLBACK_PATH}`, oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) {
      console.error(`${LOG} OAuth callback: invalid state`);
      return redirect("/");
    }
    console.log(`${LOG} OAuth callback started orgId=${parsed.orgId}`);
    const { clientId, clientSecret } = requireClickupEnv();

    try {
      const accessToken = await exchangeClickupCode(code, clientId, clientSecret);
      const db = getDb();
      const existing = await getIntegration(parsed.orgId, "clickup");
      const prev = parseSettings<ClickupSettings>(existing?.settings ?? null);
      const settings: ClickupSettings = {
        workspaceId: prev?.workspaceId,
        workspaceName: prev?.workspaceName,
        defaultListId: prev?.defaultListId,
        defaultListName: prev?.defaultListName,
        autoCreateTasks: prev?.autoCreateTasks ?? false,
      };
      await db
        .insert(integrations)
        .values({
          organizationId: parsed.orgId,
          provider: "clickup",
          accessToken,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: { accessToken, settings: JSON.stringify(settings), updatedAt: new Date() },
        });
      console.log(`${LOG} OAuth callback complete orgId=${parsed.orgId}`);
    } catch (err) {
      console.error(`${LOG} OAuth callback failed:`, err instanceof Error ? err.message : err);
    }

    const orgSlug = await getOrgSlugFromId(parsed.orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/clickup` : "/");
  }

  return data({});
}

const CONFIG_INTENTS = new Set([
  "list_workspaces",
  "list_spaces",
  "list_lists",
  "list_statuses",
  "update_settings",
  "disconnect",
]);

export async function handleClickupAction(request: Request) {
  const { session, organizationId } = await requireOrganization(request);
  await requireAdminRole(organizationId, session.user.id);

  const body = await request.json();
  const parsed = ClickupActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  if (CONFIG_INTENTS.has(parsed.data.intent)) {
    return handleClickupConfigAction(parsed.data, organizationId, session.user.id);
  }
  return handleClickupTaskAction(parsed.data, organizationId, session.user.id);
}
