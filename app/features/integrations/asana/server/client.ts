import type { AsanaProject, AsanaSection, AsanaTaskResult, AsanaWorkspace } from "./schemas";

const ASANA_API = "https://app.asana.com/api/1.0";

async function asanaFetch<T>(accessToken: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${ASANA_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Asana API error: ${res.status}`;
    try {
      const err = (await res.json()) as { errors?: Array<{ message: string }> };
      if (err.errors?.length) message = `Asana API error: ${res.status} — ${err.errors[0].message}`;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getAsanaWorkspaces(accessToken: string): Promise<AsanaWorkspace[]> {
  const d = await asanaFetch<{ data: AsanaWorkspace[] }>(
    accessToken,
    "/workspaces?opt_fields=gid,name",
  );
  return d.data;
}

export async function getAsanaProjects(
  accessToken: string,
  workspaceGid: string,
): Promise<AsanaProject[]> {
  const d = await asanaFetch<{ data: AsanaProject[] }>(
    accessToken,
    `/projects?workspace=${workspaceGid}&archived=false&limit=100&opt_fields=gid,name`,
  );
  return d.data;
}

export async function getAsanaSections(
  accessToken: string,
  projectGid: string,
): Promise<AsanaSection[]> {
  const d = await asanaFetch<{ data: AsanaSection[] }>(
    accessToken,
    `/projects/${projectGid}/sections?opt_fields=gid,name`,
  );
  return d.data;
}

const TASK_FIELDS =
  "gid,name,completed,permalink_url,memberships.project.gid,memberships.section.gid,memberships.section.name";

interface RawAsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  permalink_url: string;
  memberships: Array<{
    project: { gid: string };
    section: { gid: string; name: string } | null;
  }>;
}

function parseTaskResult(task: RawAsanaTask, workspaceGid: string): AsanaTaskResult {
  const firstSection = task.memberships?.find((m) => m.section)?.section ?? null;
  return {
    gid: task.gid,
    name: task.name,
    url: task.permalink_url ?? `https://app.asana.com/0/${workspaceGid}/${task.gid}`,
    sectionGid: firstSection?.gid ?? null,
    sectionName: firstSection?.name ?? null,
    completed: task.completed,
  };
}

export async function createAsanaTask(
  accessToken: string,
  workspaceGid: string,
  projectGid: string,
  name: string,
  notes: string,
): Promise<AsanaTaskResult> {
  const created = await asanaFetch<{ data: { gid: string } }>(accessToken, "/tasks", {
    method: "POST",
    body: JSON.stringify({ data: { name, notes, projects: [projectGid], workspace: workspaceGid } }),
  });
  const task = await asanaFetch<{ data: RawAsanaTask }>(
    accessToken,
    `/tasks/${created.data.gid}?opt_fields=${TASK_FIELDS}`,
  );
  return parseTaskResult(task.data, workspaceGid);
}

// Accepts a task GID directly, or extracts it from an Asana URL
// e.g. https://app.asana.com/0/123456789/987654321 → "987654321"
export function parseAsanaTaskInput(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/app\.asana\.com\/\d+\/\d+\/(\d+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed;
}

export async function getAsanaTaskByGid(
  accessToken: string,
  workspaceGid: string,
  taskGid: string,
): Promise<AsanaTaskResult> {
  const task = await asanaFetch<{ data: RawAsanaTask }>(
    accessToken,
    `/tasks/${taskGid}?opt_fields=${TASK_FIELDS}`,
  );
  return parseTaskResult(task.data, workspaceGid);
}

export async function registerAsanaWebhook(
  accessToken: string,
  workspaceGid: string,
  targetUrl: string,
): Promise<string> {
  const d = await asanaFetch<{ data: { gid: string } }>(accessToken, "/webhooks", {
    method: "POST",
    body: JSON.stringify({ data: { resource: workspaceGid, target: targetUrl } }),
  });
  return d.data.gid;
}

export async function deleteAsanaWebhook(accessToken: string, webhookGid: string): Promise<void> {
  await asanaFetch(accessToken, `/webhooks/${webhookGid}`, { method: "DELETE" });
}
