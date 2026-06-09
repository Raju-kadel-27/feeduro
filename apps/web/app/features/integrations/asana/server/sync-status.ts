import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { moveAsanaTaskToSection } from "./client";
import type { AsanaSettings } from "./schemas";

const LOG = "[asana-sync-status]";

export async function syncStatusToAsana(
  organizationId: string,
  postId: string,
  newFeediyoStatus: string,
): Promise<void> {
  const db = getDb();
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "asana"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(organizationId, "asana"),
  ]);

  if (!link) { console.log(`${LOG} no linked task postId=${postId}`); return; }
  if (!integration?.accessToken) { console.log(`${LOG} not connected orgId=${organizationId}`); return; }

  const settings = parseSettings<AsanaSettings>(integration.settings);
  const mapping = settings?.statusMappings?.find((m) => m.feediyoStatus === newFeediyoStatus);
  if (!mapping) { console.log(`${LOG} no mapping for feediyoStatus="${newFeediyoStatus}" postId=${postId}`); return; }

  try {
    await moveAsanaTaskToSection(integration.accessToken, mapping.sectionGid, link.externalId);
    console.log(`${LOG} moved taskGid=${link.externalId} → sectionGid=${mapping.sectionGid}`);
  } catch (err) {
    console.error(`${LOG} failed taskGid=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
