import { refreshAccessToken } from "@services/oauth/flow.server";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { integrations } from "@/db/schema";
import {
  type AutoCreatePost,
  buildPostDescription,
  isAlreadyLinked,
} from "../../server/auto-create";
import { insertPostExternalLink } from "../../server/mutations";
import { getIntegration, parseSettings } from "../../server/queries";
import { createAsanaTask } from "./client";
import { asanaOAuth } from "./oauth";
import type { AsanaSettings } from "./schemas";

export async function autoCreateAsanaTask(
  db: Db,
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(db, organizationId, "asana");
  if (!integration?.accessToken) return;

  const settings = parseSettings<AsanaSettings>(integration.settings);
  if (!settings?.autoCreateIssues || !settings.workspaceGid || !settings.defaultProjectGid) return;

  if (await isAlreadyLinked(db, post.id, "asana")) return;

  const { workspaceGid, defaultProjectGid } = settings;
  const description = buildPostDescription(post);
  let { accessToken } = integration;

  let task;
  try {
    task = await createAsanaTask(
      accessToken,
      workspaceGid,
      defaultProjectGid,
      post.title,
      description,
    );
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("401") && integration.refreshToken))
      throw err;

    const env = getEnv();
    if (!env.ASANA_CLIENT_ID || !env.ASANA_CLIENT_SECRET) throw err;

    const { accessToken: newToken, refreshToken: newRefresh } = await refreshAccessToken(
      asanaOAuth,
      integration.refreshToken,
      env.ASANA_CLIENT_ID,
      env.ASANA_CLIENT_SECRET,
    );
    await db
      .update(integrations)
      .set({
        accessToken: newToken,
        refreshToken: newRefresh ?? integration.refreshToken,
        updatedAt: new Date(),
      })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "asana")),
      );
    accessToken = newToken;
    task = await createAsanaTask(
      accessToken,
      workspaceGid,
      defaultProjectGid,
      post.title,
      description,
    );
  }

  await insertPostExternalLink(db, {
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
