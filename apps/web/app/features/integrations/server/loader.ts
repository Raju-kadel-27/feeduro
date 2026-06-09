import { requireOrgBySlug } from "@features/auth/server/guards";
import { getIntegration } from "@features/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { member } from "@/db/schema";
import type { Route } from "../../../+types/root";
import { parseSettings } from "../utils";

export async function integrationsLoader({ request, params }: Route.LoaderArgs) {
  if (!params.orgSlug) {
    throw new Response("Organization slug is required", { status: 400 });
  }

  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);

  const db = getDb();

  const [
    memberRecord,
    githubIntegration,
    linearIntegration,
    jiraIntegration,
    asanaIntegration,
    notionIntegration,
    mondayIntegration,
    trelloIntegration,
    shortcutIntegration,
    zapierIntegration,
    n8nIntegration,
    zendeskIntegration,
    hubspotIntegration,
    salesforceIntegration,
    clickupIntegration,
  ] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    }),

    getIntegration(organizationId, "github"),
    getIntegration(organizationId, "linear"),
    getIntegration(organizationId, "jira"),
    getIntegration(organizationId, "asana"),
    getIntegration(organizationId, "notion"),
    getIntegration(organizationId, "monday"),
    getIntegration(organizationId, "trello"),
    getIntegration(organizationId, "shortcut"),
    getIntegration(organizationId, "zapier"),
    getIntegration(organizationId, "n8n"),
    getIntegration(organizationId, "zendesk"),
    getIntegration(organizationId, "hubspot"),
    getIntegration(organizationId, "salesforce"),
    getIntegration(organizationId, "clickup"),
  ]);

  const githubSettings = parseSettings<{
    repoOwner?: string;
    repoName?: string;
  }>(githubIntegration?.settings);

  const linearSettings = parseSettings<{
    workspaceName?: string;
  }>(linearIntegration?.settings);

  const jiraSettings = parseSettings<{
    cloudName?: string;
  }>(jiraIntegration?.settings);

  const asanaSettings = parseSettings<{
    workspaceName?: string;
  }>(asanaIntegration?.settings);

  const notionSettings = parseSettings<{
    workspaceName?: string;
  }>(notionIntegration?.settings);

  const mondaySettings = parseSettings<{
    accountName?: string;
  }>(mondayIntegration?.settings);

  const trelloSettings = parseSettings<{
    memberUsername?: string;
  }>(trelloIntegration?.settings);

  const shortcutSettings = parseSettings<{
    memberName?: string;
    mentionName?: string;
  }>(shortcutIntegration?.settings);

  const clickupSettings = parseSettings<{
    workspaceId?: string;
    workspaceName?: string;
    defaultListId?: string;
    defaultListName?: string;
  }>(clickupIntegration?.settings);

  const zendeskSettings = parseSettings<{
    subdomain?: string;
    accountName?: string;
  }>(zendeskIntegration?.settings);

  const hubspotSettings = parseSettings<{
    portalId?: string;
    hubDomain?: string;
  }>(hubspotIntegration?.settings);

  const salesforceSettings = parseSettings<{
    instanceUrl?: string;
    displayName?: string;
  }>(salesforceIntegration?.settings);

  return {
    isAdmin: memberRecord?.role === "admin",

    zapier: {
      connected: !!zapierIntegration?.accessToken,
      webhookUrl: zapierIntegration?.accessToken ?? null,
    },

    n8n: {
      connected: !!n8nIntegration?.accessToken,
      webhookUrl: n8nIntegration?.accessToken ?? null,
    },

    zendesk: {
      configured: !!(process.env.ZENDESK_CLIENT_ID && process.env.ZENDESK_CLIENT_SECRET),
      connected: !!zendeskIntegration?.accessToken,
      subdomain: zendeskSettings?.subdomain ?? null,
      accountName: zendeskSettings?.accountName ?? null,
    },

    hubspot: {
      configured: !!(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET),
      connected: !!hubspotIntegration?.accessToken,
      portalId: hubspotSettings?.portalId ?? null,
      hubDomain: hubspotSettings?.hubDomain ?? null,
    },

    salesforce: {
      configured: !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET),
      connected: !!salesforceIntegration?.accessToken,
      instanceUrl: salesforceSettings?.instanceUrl ?? null,
      displayName: salesforceSettings?.displayName ?? null,
    },

    discord: {
      enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
    },

    slack: {
      enabled: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
    },

    github: {
      configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),

      connected: !!githubIntegration?.accessToken,

      repo:
        githubSettings?.repoOwner && githubSettings?.repoName
          ? `${githubSettings.repoOwner}/${githubSettings.repoName}`
          : null,
    },

    linear: {
      configured: !!(process.env.LINEAR_CLIENT_ID && process.env.LINEAR_CLIENT_SECRET),

      connected: !!linearIntegration?.accessToken,

      workspaceName: linearSettings?.workspaceName ?? null,
    },

    jira: {
      configured: !!(process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET),

      connected: !!jiraIntegration?.accessToken,

      cloudName: jiraSettings?.cloudName ?? null,
    },

    asana: {
      configured: !!(process.env.ASANA_CLIENT_ID && process.env.ASANA_CLIENT_SECRET),

      connected: !!asanaIntegration?.accessToken,

      workspaceName: asanaSettings?.workspaceName ?? null,
    },

    notion: {
      configured: !!(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET),

      connected: !!notionIntegration?.accessToken,

      workspaceName: notionSettings?.workspaceName ?? null,
    },

    monday: {
      configured: !!(process.env.MONDAY_CLIENT_ID && process.env.MONDAY_CLIENT_SECRET),

      connected: !!mondayIntegration?.accessToken,

      accountName: mondaySettings?.accountName ?? null,
    },

    trello: {
      configured: !!process.env.TRELLO_API_KEY,

      connected: !!trelloIntegration?.accessToken,

      memberUsername: trelloSettings?.memberUsername ?? null,
    },

    shortcut: {
      // No server-side OAuth app needed — user provides their own API token
      configured: true,

      connected: !!shortcutIntegration?.accessToken,

      memberName: shortcutSettings?.memberName ?? null,
      mentionName: shortcutSettings?.mentionName ?? null,
    },

    clickup: {
      configured: !!(process.env.CLICKUP_CLIENT_ID && process.env.CLICKUP_CLIENT_SECRET),

      connected: !!clickupIntegration?.accessToken,

      workspaceName: clickupSettings?.workspaceName ?? null,
    },
  };
}

export type IntegrationsLoaderData = Awaited<ReturnType<typeof integrationsLoader>>;
