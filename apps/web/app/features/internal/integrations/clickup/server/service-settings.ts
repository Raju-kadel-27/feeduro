import { getBaseUrl } from "@utils/base-url";
import { data } from "react-router";
import type { Db } from "@/db";
import { deleteIntegration, updateIntegrationSettings } from "../../server/mutations";
import { getIntegration, getIntegrationToken, parseSettings } from "../../server/queries";
import {
  deleteClickupWebhook,
  getClickupListStatuses,
  getClickupLists,
  getClickupSpaces,
  getClickupWorkspaces,
  registerClickupWebhook,
} from "./client";
import type { ClickupAction, ClickupSettings } from "./schemas";

const LOG = "[clickup-settings]";

export async function handleClickupConfigAction(
  db: Db,
  input: ClickupAction,
  organizationId: string,
  userId: string,
) {
  if (input.intent === "list_workspaces") {
    const accessToken = await getIntegrationToken(db, organizationId, "clickup");
    if (!accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
    try {
      return data({ workspaces: await getClickupWorkspaces(accessToken) });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch workspaces" }, { status: 400 });
    }
  }

  if (input.intent === "list_spaces") {
    const accessToken = await getIntegrationToken(db, organizationId, "clickup");
    if (!accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
    try {
      return data({ spaces: await getClickupSpaces(accessToken, input.workspaceId) });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch spaces" }, { status: 400 });
    }
  }

  if (input.intent === "list_lists") {
    const accessToken = await getIntegrationToken(db, organizationId, "clickup");
    if (!accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
    try {
      return data({ lists: await getClickupLists(accessToken, input.spaceId) });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch lists" }, { status: 400 });
    }
  }

  if (input.intent === "list_statuses") {
    const accessToken = await getIntegrationToken(db, organizationId, "clickup");
    if (!accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
    try {
      return data({ statuses: await getClickupListStatuses(accessToken, input.listId) });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch statuses" }, { status: 400 });
    }
  }

  if (input.intent === "update_settings") {
    const integration = await getIntegration(db, organizationId, "clickup");
    if (!integration?.accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
    const prev = parseSettings<ClickupSettings>(integration.settings) ?? ({} as ClickupSettings);

    let { webhookId, webhookSecret } = prev;
    const newWorkspaceId = input.workspaceId ?? prev.workspaceId;
    const webhookUrl = `${getBaseUrl()}/api/clickup/webhook?orgId=${organizationId}`;
    const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");
    const workspaceChanged = !!newWorkspaceId && newWorkspaceId !== prev.workspaceId;

    if (newWorkspaceId && !isLocal && (!webhookId || workspaceChanged)) {
      try {
        if (webhookId && workspaceChanged) {
          await deleteClickupWebhook(integration.accessToken, webhookId).catch((err) =>
            console.warn(`${LOG} failed to delete old webhook:`, err),
          );
        }
        const wh = await registerClickupWebhook(integration.accessToken, newWorkspaceId, webhookUrl);
        webhookId = wh.id;
        webhookSecret = wh.secret;
        console.log(`${LOG} webhook registered webhookId=${webhookId} orgId=${organizationId}`);
      } catch (err) {
        console.error(`${LOG} webhook registration failed:`, err instanceof Error ? err.message : err);
      }
    } else if (isLocal) {
      console.warn(`${LOG} webhook skipped — local/non-HTTPS URL`);
    }

    await updateIntegrationSettings(
      db,
      organizationId,
      "clickup",
      {
        ...prev,
        workspaceId: newWorkspaceId,
        workspaceName: input.workspaceName ?? prev.workspaceName,
        defaultSpaceId: input.defaultSpaceId ?? prev.defaultSpaceId,
        defaultListId: input.defaultListId ?? prev.defaultListId,
        defaultListName: input.defaultListName ?? prev.defaultListName,
        autoCreateTasks: input.autoCreateTasks,
        webhookId,
        webhookSecret,
        statusMappings: input.statusMappings ?? prev.statusMappings,
      },
      userId,
    );
    console.log(`${LOG} settings updated orgId=${organizationId} hasWebhook=${!!webhookId}`);
    return data({ success: true });
  }

  if (input.intent === "disconnect") {
    const integration = await getIntegration(db, organizationId, "clickup");
    if (integration?.accessToken) {
      const settings = parseSettings<ClickupSettings>(integration.settings);
      if (settings?.webhookId) {
        await deleteClickupWebhook(integration.accessToken, settings.webhookId).catch((err) =>
          console.warn(`${LOG} failed to delete webhook on disconnect:`, err),
        );
      }
    }
    await deleteIntegration(db, organizationId, "clickup");
    console.log(`${LOG} disconnected orgId=${organizationId}`);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
