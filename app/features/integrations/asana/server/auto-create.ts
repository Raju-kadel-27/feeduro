import { createAsanaTask } from "./client";
import { asanaOAuth } from "./oauth";
import type { AsanaSettings } from "./schemas";
import { refreshAccessToken } from "@services/oauth/flow.server";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { integrations } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { insertPostExternalLink } from "../../server/mutations";
import { buildPostDescription, isAlreadyLinked, type AutoCreatePost } from "../../server/auto-create";

export async function autoCreateAsanaTask(
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(organizationId, "asana");
  if (!integration?.accessToken) return;

  const settings = parseSettings<AsanaSettings>(integration.settings);
  if (!settings?.autoCreateIssues || !settings.workspaceGid || !settings.defaultProjectGid) return;

  if (await isAlreadyLinked(post.id, "asana")) return;

  const { workspaceGid, defaultProjectGid } = settings;
  const description = buildPostDescription(post);
  let { accessToken } = integration;

  let task;
  try {
    task = await createAsanaTask(accessToken, workspaceGid, defaultProjectGid, post.title, description);
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("401") && integration.refreshToken)) throw err;

    const env = getEnv();
    if (!env.ASANA_CLIENT_ID || !env.ASANA_CLIENT_SECRET) throw err;

    const { accessToken: newToken, refreshToken: newRefresh } = await refreshAccessToken(
      asanaOAuth,
      integration.refreshToken,
      env.ASANA_CLIENT_ID,
      env.ASANA_CLIENT_SECRET,
    );
    const db = getDb();
    await db
      .update(integrations)
      .set({ accessToken: newToken, refreshToken: newRefresh ?? integration.refreshToken, updatedAt: new Date() })
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "asana")));
    accessToken = newToken;
    task = await createAsanaTask(accessToken, workspaceGid, defaultProjectGid, post.title, description);
  }

  await insertPostExternalLink({
    postId: post.id,
    organizationId,
    provider: "asana",
    externalId: task.gid,
    externalUrl: task.url,
    identifier: task.gid,
    externalTitle: task.name,
    externalStatus: task.completed ? "Completed" : (task.sectionName ?? ""),
    linkedByUserId: userId,
  });
}
