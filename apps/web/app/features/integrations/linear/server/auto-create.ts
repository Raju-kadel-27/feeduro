import { type AutoCreatePost, isAlreadyLinked } from "../../server/auto-create";
import { insertPostExternalLink } from "../../server/mutations";
import { getIntegration, parseSettings } from "../../server/queries";
import { createLinearIssue } from "./client";
import type { LinearSettings } from "./schemas";

const LOG = "[linear-auto-create]";

export async function autoCreateLinearIssue(
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(organizationId, "linear");
  if (!integration?.accessToken) {
    console.log(`${LOG} skipped — no integration or token orgId=${organizationId}`);
    return;
  }

  const settings = parseSettings<LinearSettings>(integration.settings);
  if (!settings?.autoCreateIssues) {
    console.log(`${LOG} skipped — autoCreateIssues=false orgId=${organizationId}`);
    return;
  }
  if (!settings.defaultTeamId) {
    console.log(`${LOG} skipped — no defaultTeamId orgId=${organizationId}`);
    return;
  }

  if (await isAlreadyLinked(post.id, "linear")) {
    console.log(`${LOG} skipped — already linked postId=${post.id}`);
    return;
  }

  console.log(
    `${LOG} creating issue postId=${post.id} teamId=${settings.defaultTeamId} orgId=${organizationId}`,
  );

  try {
    const description = post.description
      ? `${post.description}\n\n---\n*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`
      : `*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`;

    const issue = await createLinearIssue(
      integration.accessToken,
      settings.defaultTeamId,
      post.title,
      description,
    );

    console.log(
      `${LOG} issue created issueId=${issue.id} identifier=${issue.identifier} postId=${post.id}`,
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

    console.log(`${LOG} link saved postId=${post.id} issueId=${issue.id}`);
  } catch (err) {
    console.error(
      `${LOG} failed postId=${post.id} orgId=${organizationId}`,
      err instanceof Error ? err.message : err,
    );
  }
}
