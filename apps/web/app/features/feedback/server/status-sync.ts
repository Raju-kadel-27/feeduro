import { syncStatusToAsana } from "@features/internal/integrations/asana/server/sync-status";
import { syncStatusToClickup } from "@features/internal/integrations/clickup/server/sync-status";
import { syncStatusToJira } from "@features/internal/integrations/jira/server/sync-status";
import { syncStatusToLinear } from "@features/internal/integrations/linear/server/sync-status";
import { syncStatusToMonday } from "@features/internal/integrations/monday/server/sync-status";
import { syncStatusToShortcut } from "@features/internal/integrations/shortcut/server/sync-status";
import { syncStatusToTrello } from "@features/internal/integrations/trello/server/sync-status";

export async function fireStatusSyncIntegrations(
  organizationId: string,
  postId: string,
  newStatus: string,
): Promise<void> {
  await Promise.allSettled([
    syncStatusToClickup(organizationId, postId, newStatus).catch((err) =>
      console.error("[clickup-sync-status]", err),
    ),
    syncStatusToLinear(organizationId, postId, newStatus).catch((err) =>
      console.error("[linear-sync-status]", err),
    ),
    syncStatusToJira(organizationId, postId, newStatus).catch((err) =>
      console.error("[jira-sync-status]", err),
    ),
    syncStatusToAsana(organizationId, postId, newStatus).catch((err) =>
      console.error("[asana-sync-status]", err),
    ),
    syncStatusToMonday(organizationId, postId, newStatus).catch((err) =>
      console.error("[monday-sync-status]", err),
    ),
    syncStatusToShortcut(organizationId, postId, newStatus).catch((err) =>
      console.error("[shortcut-sync-status]", err),
    ),
    syncStatusToTrello(organizationId, postId, newStatus).catch((err) =>
      console.error("[trello-sync-status]", err),
    ),
  ]);
}
