import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { integrations, postExternalLinks } from "@/db/schema";

const LINK_COLUMNS = {
  identifier: true,
  externalTitle: true,
  externalStatus: true,
  externalUrl: true,
} as const;

type LinkRow =
  | {
      identifier: string | null;
      externalTitle: string | null;
      externalStatus: string | null;
      externalUrl: string | null;
    }
  | undefined;

function shapeLink(row: LinkRow) {
  if (!row) return null;
  return {
    identifier: row.identifier ?? null,
    externalTitle: row.externalTitle ?? null,
    externalStatus: row.externalStatus ?? null,
    externalUrl: row.externalUrl ?? null,
  };
}

export async function getPostIntegrationLinks(db: Db, organizationId: string, postId: string) {
  const [
    linearLinkRow, linearIntegration,
    jiraLinkRow, jiraIntegration,
    asanaLinkRow, asanaIntegration,
    githubLinkRow, githubIntegration,
    clickupLinkRow, clickupIntegration,
    shortcutLinkRow, shortcutIntegration,
    notionLinkRow, notionIntegration,
    trelloLinkRow, trelloIntegration,
    mondayLinkRow, mondayIntegration,
    zendeskLinkRow, zendeskIntegration,
    hubspotLinkRow, hubspotIntegration,
    salesforceLinkRow, salesforceIntegration,
  ] = await Promise.all([
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "linear")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "linear")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "jira")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "jira")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "asana")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "asana")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "github")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "github")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "clickup")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "clickup")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "shortcut")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "shortcut")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "notion")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "notion")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "trello")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "trello")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "monday")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "monday")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "zendesk")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "zendesk")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "hubspot")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "hubspot")), columns: { id: true } }),
    db.query.postExternalLinks.findFirst({ where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "salesforce")), columns: LINK_COLUMNS }),
    db.query.integrations.findFirst({ where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "salesforce")), columns: { id: true } }),
  ]);

  return {
    linearLink: shapeLink(linearLinkRow),
    linearConnected: !!linearIntegration,
    jiraLink: shapeLink(jiraLinkRow),
    jiraConnected: !!jiraIntegration,
    asanaLink: shapeLink(asanaLinkRow),
    asanaConnected: !!asanaIntegration,
    githubLink: shapeLink(githubLinkRow),
    githubConnected: !!githubIntegration,
    clickupLink: shapeLink(clickupLinkRow),
    clickupConnected: !!clickupIntegration,
    shortcutLink: shapeLink(shortcutLinkRow),
    shortcutConnected: !!shortcutIntegration,
    notionLink: shapeLink(notionLinkRow),
    notionConnected: !!notionIntegration,
    trelloLink: shapeLink(trelloLinkRow),
    trelloConnected: !!trelloIntegration,
    mondayLink: shapeLink(mondayLinkRow),
    mondayConnected: !!mondayIntegration,
    zendeskLink: shapeLink(zendeskLinkRow),
    zendeskConnected: !!zendeskIntegration,
    hubspotLink: shapeLink(hubspotLinkRow),
    hubspotConnected: !!hubspotIntegration,
    salesforceLink: shapeLink(salesforceLinkRow),
    salesforceConnected: !!salesforceIntegration,
  };
}
