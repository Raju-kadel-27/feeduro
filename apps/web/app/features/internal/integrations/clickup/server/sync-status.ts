import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { updateClickupTaskStatus } from "./client";
import type { ClickupSettings } from "./schemas";

const LOG = "[clickup-sync-status]";

/**
 * Reverse the saved status mappings to find the ClickUp status name
 * that corresponds to the given Feeduro status.
 */
function resolveClickupStatus(
  feeduroStatus: string,
  mappings: ClickupSettings["statusMappings"],
): string | null {
  return mappings?.find((m) => m.feeduroStatus === feeduroStatus)?.clickupStatus ?? null;
}

/**
 * When a Feeduro post status changes, push the mapped status to the
 * linked ClickUp task (if one exists and a mapping is configured).
 * Fire-and-forget — never throws, only logs on failure.
 */
export async function syncStatusToClickup(
  db: Db,
  organizationId: string,
  postId: string,
  newFeeduroStatus: string,
): Promise<void> {
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "clickup"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(db, organizationId, "clickup"),
  ]);

  if (!link) {
    console.log(`${LOG} no linked ClickUp task postId=${postId} — skipping`);
    return;
  }
  if (!integration?.accessToken) {
    console.log(`${LOG} ClickUp not connected orgId=${organizationId}`);
    return;
  }

  const settings = parseSettings<ClickupSettings>(integration.settings);
  const clickupStatus = resolveClickupStatus(newFeeduroStatus, settings?.statusMappings);
  if (!clickupStatus) {
    console.log(`${LOG} no mapping for feeduroStatus="${newFeeduroStatus}" postId=${postId}`);
    return;
  }

  try {
    await updateClickupTaskStatus(integration.accessToken, link.externalId, clickupStatus);
    console.log(`${LOG} updated taskId=${link.externalId} → status="${clickupStatus}"`);
  } catch (err) {
    console.error(`${LOG} failed taskId=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
