import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { updateShortcutStoryState } from "./client";
import type { ShortcutSettings } from "./schemas";

const LOG = "[shortcut-sync-status]";

export async function syncStatusToShortcut(
  organizationId: string,
  postId: string,
  newFeediyoStatus: string,
): Promise<void> {
  const db = getDb();
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "shortcut"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(organizationId, "shortcut"),
  ]);

  if (!link) { console.log(`${LOG} no linked story postId=${postId}`); return; }
  if (!integration?.accessToken) { console.log(`${LOG} not connected orgId=${organizationId}`); return; }

  const settings = parseSettings<ShortcutSettings>(integration.settings);
  const mapping = settings?.statusMappings?.find((m) => m.feediyoStatus === newFeediyoStatus);
  if (!mapping) { console.log(`${LOG} no mapping for feediyoStatus="${newFeediyoStatus}" postId=${postId}`); return; }

  try {
    await updateShortcutStoryState(integration.accessToken, link.externalId, mapping.workflowStateId);
    console.log(`${LOG} updated storyId=${link.externalId} → stateId=${mapping.workflowStateId}`);
  } catch (err) {
    console.error(`${LOG} failed storyId=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
