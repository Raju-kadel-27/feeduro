import type { ClickupList, ClickupSpace, ClickupStatus, ClickupTask, ClickupWorkspace } from "./schemas";

const BASE = "https://api.clickup.com/api/v2";

async function clickupFetch<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: accessToken, "Content-Type": "application/json" },
  });
  const json = (await res.json()) as T & { err?: string };
  if (!res.ok) throw new Error((json as { err?: string }).err ?? `ClickUp API error: ${res.status}`);
  return json;
}

async function clickupPost<T>(accessToken: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: accessToken, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { err?: string };
  if (!res.ok) throw new Error((json as { err?: string }).err ?? `ClickUp API error: ${res.status}`);
  return json;
}

export async function getClickupWorkspaces(accessToken: string): Promise<ClickupWorkspace[]> {
  const d = await clickupFetch<{ teams: ClickupWorkspace[] }>(accessToken, "/team");
  return d.teams;
}

export async function getClickupSpaces(
  accessToken: string,
  workspaceId: string,
): Promise<ClickupSpace[]> {
  const d = await clickupFetch<{ spaces: ClickupSpace[] }>(
    accessToken,
    `/team/${workspaceId}/space?archived=false`,
  );
  return d.spaces;
}

export async function getClickupLists(
  accessToken: string,
  spaceId: string,
): Promise<ClickupList[]> {
  const [directRes, foldersRes] = await Promise.all([
    clickupFetch<{ lists: ClickupList[] }>(accessToken, `/space/${spaceId}/list?archived=false`),
    clickupFetch<{ folders: Array<{ id: string; name: string; lists: ClickupList[] }> }>(
      accessToken,
      `/space/${spaceId}/folder?archived=false`,
    ),
  ]);
  const direct = directRes.lists.map((l) => ({ ...l }));
  const fromFolders = foldersRes.folders.flatMap((f) =>
    f.lists.map((l) => ({ ...l, folder: f.name })),
  );
  return [...direct, ...fromFolders];
}

export async function createClickupTask(
  accessToken: string,
  listId: string,
  name: string,
  markdownDescription: string,
): Promise<ClickupTask> {
  return clickupPost<ClickupTask>(accessToken, `/list/${listId}/task`, {
    name,
    markdown_description: markdownDescription,
  });
}

export async function getClickupTask(accessToken: string, taskId: string): Promise<ClickupTask> {
  return clickupFetch<ClickupTask>(accessToken, `/task/${taskId}`);
}

export async function searchClickupTasks(
  accessToken: string,
  workspaceId: string,
  query: string,
): Promise<ClickupTask[]> {
  const d = await clickupFetch<{ tasks: ClickupTask[] }>(
    accessToken,
    `/team/${workspaceId}/task?query=${encodeURIComponent(query)}&subtasks=true&page=0`,
  );
  return (d.tasks ?? []).slice(0, 10);
}

// Extracts task ID from a ClickUp URL (app.clickup.com/t/TASKID) or returns input unchanged.
export function parseClickupInput(input: string): string {
  const match = input.trim().match(/app\.clickup\.com\/t\/([a-z0-9]+)/i);
  return match?.[1] ?? input.trim();
}

// Returns custom_id (e.g. "PROJ-123") if set, else the raw task ID.
export function getTaskIdentifier(task: ClickupTask): string {
  return task.custom_id ?? task.id;
}

export async function getClickupListStatuses(
  accessToken: string,
  listId: string,
): Promise<ClickupStatus[]> {
  const d = await clickupFetch<{ statuses?: ClickupStatus[] }>(accessToken, `/list/${listId}`);
  return d.statuses ?? [];
}

export async function registerClickupWebhook(
  accessToken: string,
  workspaceId: string,
  endpointUrl: string,
): Promise<{ id: string; secret: string }> {
  const d = await clickupPost<{ webhook: { id: string; secret: string } }>(
    accessToken,
    `/team/${workspaceId}/webhook`,
    { endpoint: endpointUrl, events: ["taskStatusUpdated"] },
  );
  return { id: d.webhook.id, secret: d.webhook.secret };
}

export async function updateClickupTaskStatus(accessToken: string, taskId: string, statusName: string): Promise<void> {
  const res = await fetch(`${BASE}/task/${taskId}`, { method: "PUT", headers: { Authorization: accessToken, "Content-Type": "application/json" }, body: JSON.stringify({ status: statusName }) });
  if (!res.ok) { const j = (await res.json().catch(() => ({}))) as { err?: string }; throw new Error(j.err ?? `ClickUp API error: ${res.status}`); }
}

export async function deleteClickupWebhook(accessToken: string, webhookId: string): Promise<void> {
  const res = await fetch(`${BASE}/webhook/${webhookId}`, {
    method: "DELETE",
    headers: { Authorization: accessToken },
  });
  if (!res.ok) throw new Error(`Failed to delete ClickUp webhook: ${res.status}`);
}

export async function verifyClickupWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === signature;
  } catch {
    return false;
  }
}
