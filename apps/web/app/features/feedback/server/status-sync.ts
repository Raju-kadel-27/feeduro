import { syncStatusToAsana } from "@features/integrations/asana/server/sync-status";
import { syncStatusToClickup } from "@features/integrations/clickup/server/sync-status";
import { syncStatusToJira } from "@features/integrations/jira/server/sync-status";
import { syncStatusToLinear } from "@features/integrations/linear/server/sync-status";
import { syncStatusToMonday } from "@features/integrations/monday/server/sync-status";
import { syncStatusToShortcut } from "@features/integrations/shortcut/server/sync-status";
import { syncStatusToTrello } from "@features/integrations/trello/server/sync-status";

export function fireStatusSyncIntegrations(
  organizationId: string,
  postId: string,
  newStatus: string,
): void {
  syncStatusToClickup(organizationId, postId, newStatus).catch((err) =>
    console.error("[clickup-sync-status]", err),
  );
  syncStatusToLinear(organizationId, postId, newStatus).catch((err) =>
    console.error("[linear-sync-status]", err),
  );
  syncStatusToJira(organizationId, postId, newStatus).catch((err) =>
    console.error("[jira-sync-status]", err),
  );
  syncStatusToAsana(organizationId, postId, newStatus).catch((err) =>
    console.error("[asana-sync-status]", err),
  );
  syncStatusToMonday(organizationId, postId, newStatus).catch((err) =>
    console.error("[monday-sync-status]", err),
  );
  syncStatusToShortcut(organizationId, postId, newStatus).catch((err) =>
    console.error("[shortcut-sync-status]", err),
  );
  syncStatusToTrello(organizationId, postId, newStatus).catch((err) =>
    console.error("[trello-sync-status]", err),
  );
}
