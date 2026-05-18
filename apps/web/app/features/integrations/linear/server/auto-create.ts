import { type AutoCreatePost, isAlreadyLinked } from "../../server/auto-create";
import { insertPostExternalLink } from "../../server/mutations";
import { getIntegration, parseSettings } from "../../server/queries";
import { createLinearIssue } from "./client";
import type { LinearSettings } from "./schemas";

export async function autoCreateLinearIssue(
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(organizationId, "linear");
  if (!integration?.accessToken) return;

  const settings = parseSettings<LinearSettings>(integration.settings);
  if (!settings?.autoCreateIssues || !settings.defaultTeamId) return;

  if (await isAlreadyLinked(post.id, "linear")) return;

  const description = post.description
    ? `${post.description}\n\n---\n*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`
    : `*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`;

  const issue = await createLinearIssue(
    integration.accessToken,
    settings.defaultTeamId,
    post.title,
    description,
  );

  await insertPostExternalLink({
    postId: post.id,
    organizationId,
    provider: "linear",
    externalId: issue.id,
    externalUrl: issue.url,
    identifier: issue.identifier,
    externalTitle: issue.title,
    externalStatus: issue.state.name,
    linkedByUserId: userId,
  });
}
