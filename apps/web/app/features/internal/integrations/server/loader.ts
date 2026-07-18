import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { integrations, member } from "@/db/schema";
import { parseSettings } from "../utils";
import type { IntegrationProvider } from "./queries";

const PROVIDERS: IntegrationProvider[] = [
  "github",
  "linear",
  "jira",
  "asana",
  "notion",
  "monday",
  "trello",
  "shortcut",
  "zapier",
  "n8n",
  "zendesk",
  "hubspot",
  "salesforce",
  "clickup",
  "notifications",
];

type IntegrationRow = { provider: IntegrationProvider; accessToken: string | null; settings: string | null };

export async function integrationsLoader(db: Db, organizationId: string, userId: string) {
  const [memberRecord, rows] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
      columns: { role: true },
    }),
    db.query.integrations.findMany({
      where: and(
        eq(integrations.organizationId, organizationId),
        inArray(integrations.provider, PROVIDERS),
      ),
      columns: { provider: true, accessToken: true, settings: true },
    }),
  ]);

  const byProvider = Object.fromEntries(
    (rows as IntegrationRow[]).map((r) => [r.provider, r]),
  ) as Partial<Record<IntegrationProvider, IntegrationRow>>;

  const get = (p: IntegrationProvider): IntegrationRow | null => byProvider[p] ?? null;

  const githubIntegration = get("github");
  const linearIntegration = get("linear");
  const jiraIntegration = get("jira");
  const asanaIntegration = get("asana");
  const notionIntegration = get("notion");
  const mondayIntegration = get("monday");
  const trelloIntegration = get("trello");
  const shortcutIntegration = get("shortcut");
  const zapierIntegration = get("zapier");
  const n8nIntegration = get("n8n");
  const zendeskIntegration = get("zendesk");
  const hubspotIntegration = get("hubspot");
  const salesforceIntegration = get("salesforce");
  const clickupIntegration = get("clickup");
  const notificationsIntegration = get("notifications");

  const githubSettings = parseSettings<{ repoOwner?: string; repoName?: string }>(githubIntegration?.settings);
  const linearSettings = parseSettings<{ workspaceName?: string }>(linearIntegration?.settings);
  const jiraSettings = parseSettings<{ cloudName?: string }>(jiraIntegration?.settings);
  const asanaSettings = parseSettings<{ workspaceName?: string }>(asanaIntegration?.settings);
  const notionSettings = parseSettings<{ workspaceName?: string }>(notionIntegration?.settings);
  const mondaySettings = parseSettings<{ accountName?: string }>(mondayIntegration?.settings);
  const trelloSettings = parseSettings<{ memberUsername?: string }>(trelloIntegration?.settings);
  const shortcutSettings = parseSettings<{ memberName?: string; mentionName?: string }>(shortcutIntegration?.settings);
  const clickupSettings = parseSettings<{ workspaceId?: string; workspaceName?: string; defaultListId?: string; defaultListName?: string }>(clickupIntegration?.settings);
  const zendeskSettings = parseSettings<{ subdomain?: string; accountName?: string }>(zendeskIntegration?.settings);
  const hubspotSettings = parseSettings<{ portalId?: string; hubDomain?: string }>(hubspotIntegration?.settings);
  const salesforceSettings = parseSettings<{ instanceUrl?: string; displayName?: string }>(salesforceIntegration?.settings);
  const notificationSettings = parseSettings<{ enabledEvents?: string[]; discordWebhookUrl?: string; discordChannelId?: string; slackWebhookUrl?: string; slackChannel?: string }>(notificationsIntegration?.settings);
  const enabledEvents = notificationSettings?.enabledEvents ?? ["feedback.created"];

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
      connected: !!(notificationSettings?.discordWebhookUrl),
    },

    slack: {
      enabled: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
      connected: !!(notificationSettings?.slackWebhookUrl),
    },

    notifications: {
      enabledEvents,
      discordWebhookUrl: notificationSettings?.discordWebhookUrl ?? null,
      discordChannelId: notificationSettings?.discordChannelId ?? null,
      slackWebhookUrl: notificationSettings?.slackWebhookUrl ?? null,
      slackChannel: notificationSettings?.slackChannel ?? null,
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
