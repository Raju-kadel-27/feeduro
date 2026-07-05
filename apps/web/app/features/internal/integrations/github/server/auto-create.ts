import type { Db } from "@/db";
import { type AutoCreatePost, isAlreadyLinked } from "../../server/auto-create";
import { insertPostExternalLink } from "../../server/mutations";
import { getIntegration, parseSettings } from "../../server/queries";
import { createGithubIssue } from "./client";
import type { GithubSettings } from "./schemas";

export async function autoCreateGithubIssue(
  db: Db,
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(db, organizationId, "github");
  if (!integration?.accessToken) return;

  const settings = parseSettings<GithubSettings>(integration.settings);
  if (!settings?.autoCreateIssues || !settings.repoOwner || !settings.repoName) return;

  if (await isAlreadyLinked(post.id, "github")) return;

  const bodyText = post.description
    ? `${post.description}\n\n---\n*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`
    : `*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`;

  const issue = await createGithubIssue(
    integration.accessToken,
    settings.repoOwner,
    settings.repoName,
    post.title,
    bodyText,
  );

  await insertPostExternalLink(db, {
    postId: post.id,
    organizationId,
    provider: "github",
    externalId: String(issue.number),
    externalUrl: issue.html_url,
    identifier: `#${issue.number}`,
    externalTitle: issue.title,
    externalStatus: issue.state,
    linkedByUserId: userId,
    metadata: JSON.stringify({ issueNumber: issue.number }),
  });
}
