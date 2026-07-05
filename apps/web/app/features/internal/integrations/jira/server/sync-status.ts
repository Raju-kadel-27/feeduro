import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { transitionJiraIssue } from "./client";
import type { JiraSettings } from "./schemas";

const LOG = "[jira-sync-status]";

export async function syncStatusToJira(
  db: Db,
  organizationId: string,
  postId: string,
  newFeeduroStatus: string,
): Promise<void> {
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "jira"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(db, organizationId, "jira"),
  ]);

  if (!link) { console.log(`${LOG} no linked issue postId=${postId}`); return; }
  if (!integration?.accessToken) { console.log(`${LOG} not connected orgId=${organizationId}`); return; }

  const settings = parseSettings<JiraSettings>(integration.settings);
  if (!settings?.cloudId) { console.log(`${LOG} no cloudId orgId=${organizationId}`); return; }

  const mapping = settings.statusMappings?.find((m) => m.feeduroStatus === newFeeduroStatus);
  if (!mapping) { console.log(`${LOG} no mapping for feeduroStatus="${newFeeduroStatus}" postId=${postId}`); return; }

  try {
    await transitionJiraIssue(integration.accessToken, settings.cloudId, link.externalId, mapping.jiraStatusId);
    console.log(`${LOG} transitioned issueId=${link.externalId} → statusId=${mapping.jiraStatusId}`);
  } catch (err) {
    console.error(`${LOG} failed issueId=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
