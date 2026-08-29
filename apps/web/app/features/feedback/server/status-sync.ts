import { syncStatusToAsana } from "@features/internal/integrations/asana/server/sync-status";
import { syncStatusToClickup } from "@features/internal/integrations/clickup/server/sync-status";
import { syncStatusToJira } from "@features/internal/integrations/jira/server/sync-status";
import { syncStatusToLinear } from "@features/internal/integrations/linear/server/sync-status";
import { syncStatusToMonday } from "@features/internal/integrations/monday/server/sync-status";
import { syncStatusToShortcut } from "@features/internal/integrations/shortcut/server/sync-status";
import { syncStatusToTrello } from "@features/internal/integrations/trello/server/sync-status";
import type { Db } from "@/db";

export async function fireStatusSyncIntegrations(
  db: Db,
  organizationId: string,
  postId: string,
  newStatus: string,
): Promise<void> {
  await Promise.allSettled([
    syncStatusToClickup(db, organizationId, postId, newStatus).catch((err) =>
      console.error("[clickup-sync-status]", err),
    ),
    syncStatusToLinear(db, organizationId, postId, newStatus).catch((err) =>
      console.error("[linear-sync-status]", err),
    ),
    syncStatusToJira(db, organizationId, postId, newStatus).catch((err) =>
      console.error("[jira-sync-status]", err),
    ),
    syncStatusToAsana(db, organizationId, postId, newStatus).catch((err) =>
      console.error("[asana-sync-status]", err),
    ),
    syncStatusToMonday(db, organizationId, postId, newStatus).catch((err) =>
      console.error("[monday-sync-status]", err),
    ),
    syncStatusToShortcut(db, organizationId, postId, newStatus).catch((err) =>
      console.error("[shortcut-sync-status]", err),
    ),
    syncStatusToTrello(db, organizationId, postId, newStatus).catch((err) =>
      console.error("[trello-sync-status]", err),
    ),
  ]);
}
