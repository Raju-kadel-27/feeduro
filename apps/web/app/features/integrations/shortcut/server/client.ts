import type { ShortcutMember, ShortcutStory, ShortcutWebhook, ShortcutWorkflow } from "./schemas";

const SC_BASE = "https://api.app.shortcut.com/api/v3";

async function scFetch<T>(token: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${SC_BASE}${path}`, {
    ...options,
    headers: {
      "Shortcut-Token": token,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Shortcut API error: ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) message = `Shortcut API error: ${res.status} — ${err.message}`;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getShortcutMember(token: string): Promise<ShortcutMember> {
  return scFetch<ShortcutMember>(token, "/member");
}

export async function getShortcutWorkflows(token: string): Promise<ShortcutWorkflow[]> {
  return scFetch<ShortcutWorkflow[]>(token, "/workflows");
}

export async function createShortcutStory(
  token: string,
  workflowStateId: number,
  name: string,
  description: string,
): Promise<ShortcutStory> {
  return scFetch<ShortcutStory>(token, "/stories", {
    method: "POST",
    body: JSON.stringify({ name, description, workflow_state_id: workflowStateId }),
  });
}

export async function updateShortcutStoryState(token: string, storyId: string, workflowStateId: number): Promise<void> {
  await scFetch(token, `/stories/${storyId}`, { method: "PUT", body: JSON.stringify({ workflow_state_id: workflowStateId }) });
}

export async function getShortcutStory(token: string, storyId: number): Promise<ShortcutStory> {
  return scFetch<ShortcutStory>(token, `/stories/${storyId}`);
}

export async function registerShortcutWebhook(
  token: string,
  webhookUrl: string,
): Promise<ShortcutWebhook> {
  const d = await scFetch<{ id: string; secret: string }>(token, "/webhooks", {
    method: "POST",
    body: JSON.stringify({ url: webhookUrl }),
  });
  return { id: d.id, secret: d.secret };
}

export async function deleteShortcutWebhook(token: string, webhookId: string): Promise<void> {
  await scFetch(token, `/webhooks/${webhookId}`, { method: "DELETE" });
}

export async function verifyShortcutWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hex = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === signature;
  } catch {
    return false;
  }
}
