import { createJiraIssue } from "./client";
import { jiraOAuth } from "./oauth";
import type { JiraSettings } from "./schemas";
import { refreshAccessToken } from "@services/oauth/flow.server";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { integrations } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { insertPostExternalLink } from "../../server/mutations";
import { buildPostDescription, isAlreadyLinked, type AutoCreatePost } from "../../server/auto-create";

export async function autoCreateJiraIssue(
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(organizationId, "jira");
  if (!integration?.accessToken) return;

  const settings = parseSettings<JiraSettings>(integration.settings);
  if (!settings?.autoCreateIssues || !settings.cloudId || !settings.cloudUrl || !settings.defaultProjectKey) return;

  if (await isAlreadyLinked(post.id, "jira")) return;

  const { cloudId, cloudUrl, defaultProjectKey } = settings;
  const description = buildPostDescription(post);
  let { accessToken } = integration;

  let issue;
  try {
    issue = await createJiraIssue(accessToken, cloudId, cloudUrl, defaultProjectKey, post.title, description);
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("401") && integration.refreshToken)) throw err;

    const env = getEnv();
    if (!env.JIRA_CLIENT_ID || !env.JIRA_CLIENT_SECRET) throw err;

    const { accessToken: newToken, refreshToken: newRefresh } = await refreshAccessToken(
      jiraOAuth,
      integration.refreshToken,
      env.JIRA_CLIENT_ID,
      env.JIRA_CLIENT_SECRET,
    );
    const db = getDb();
    await db
      .update(integrations)
      .set({ accessToken: newToken, refreshToken: newRefresh ?? integration.refreshToken, updatedAt: new Date() })
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "jira")));
    accessToken = newToken;
    issue = await createJiraIssue(accessToken, cloudId, cloudUrl, defaultProjectKey, post.title, description);
  }

  await insertPostExternalLink({
    postId: post.id,
    organizationId,
    provider: "jira",
    externalId: issue.id,
    externalUrl: issue.url,
    identifier: issue.key,
    externalTitle: issue.summary,
    externalStatus: issue.statusName,
    linkedByUserId: userId,
  });
}
