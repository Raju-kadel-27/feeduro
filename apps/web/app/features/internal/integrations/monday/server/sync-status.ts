import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { moveMondayItemToGroup } from "./client";
import type { MondaySettings } from "./schemas";

const LOG = "[monday-sync-status]";

export async function syncStatusToMonday(
  db: Db,
  organizationId: string,
  postId: string,
  newFeeduroStatus: string,
): Promise<void> {
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "monday"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(db, organizationId, "monday"),
  ]);

  if (!link) { console.log(`${LOG} no linked item postId=${postId}`); return; }
  if (!integration?.accessToken) { console.log(`${LOG} not connected orgId=${organizationId}`); return; }

  const settings = parseSettings<MondaySettings>(integration.settings);
  if (!settings?.defaultBoardId) { console.log(`${LOG} no boardId orgId=${organizationId}`); return; }

  const mapping = settings.statusMappings?.find((m) => m.feeduroStatus === newFeeduroStatus);
  if (!mapping) { console.log(`${LOG} no mapping for feeduroStatus="${newFeeduroStatus}" postId=${postId}`); return; }

  try {
    await moveMondayItemToGroup(integration.accessToken, settings.defaultBoardId, link.externalId, mapping.groupId);
    console.log(`${LOG} moved itemId=${link.externalId} → groupId=${mapping.groupId}`);
  } catch (err) {
    console.error(`${LOG} failed itemId=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
