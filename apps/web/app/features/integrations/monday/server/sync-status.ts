import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { moveMondayItemToGroup } from "./client";
import type { MondaySettings } from "./schemas";

const LOG = "[monday-sync-status]";

export async function syncStatusToMonday(
  organizationId: string,
  postId: string,
  newFeediyoStatus: string,
): Promise<void> {
  const db = getDb();
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "monday"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(organizationId, "monday"),
  ]);

  if (!link) { console.log(`${LOG} no linked item postId=${postId}`); return; }
  if (!integration?.accessToken) { console.log(`${LOG} not connected orgId=${organizationId}`); return; }

  const settings = parseSettings<MondaySettings>(integration.settings);
  if (!settings?.defaultBoardId) { console.log(`${LOG} no boardId orgId=${organizationId}`); return; }

  const mapping = settings.statusMappings?.find((m) => m.feediyoStatus === newFeediyoStatus);
  if (!mapping) { console.log(`${LOG} no mapping for feediyoStatus="${newFeediyoStatus}" postId=${postId}`); return; }

  try {
    await moveMondayItemToGroup(integration.accessToken, settings.defaultBoardId, link.externalId, mapping.groupId);
    console.log(`${LOG} moved itemId=${link.externalId} → groupId=${mapping.groupId}`);
  } catch (err) {
    console.error(`${LOG} failed itemId=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
