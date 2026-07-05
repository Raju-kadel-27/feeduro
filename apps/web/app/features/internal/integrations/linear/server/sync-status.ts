import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { updateLinearIssueState } from "./client";
import type { LinearSettings } from "./schemas";

const LOG = "[linear-sync-status]";

export async function syncStatusToLinear(
  db: Db,
  organizationId: string,
  postId: string,
  newFeeduroStatus: string,
): Promise<void> {
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "linear"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(db, organizationId, "linear"),
  ]);

  if (!link) { console.log(`${LOG} no linked issue postId=${postId}`); return; }
  if (!integration?.accessToken) { console.log(`${LOG} not connected orgId=${organizationId}`); return; }

  const settings = parseSettings<LinearSettings>(integration.settings);
  const mapping = settings?.statusMappings?.find((m) => m.feeduroStatus === newFeeduroStatus);
  if (!mapping) { console.log(`${LOG} no mapping for feeduroStatus="${newFeeduroStatus}" postId=${postId}`); return; }

  try {
    await updateLinearIssueState(integration.accessToken, link.externalId, mapping.linearStateId);
    console.log(`${LOG} updated issueId=${link.externalId} → stateId=${mapping.linearStateId}`);
  } catch (err) {
    console.error(`${LOG} failed issueId=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
