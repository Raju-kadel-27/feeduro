const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface NotionDatabase {
  id: string;
  name: string;
}

export interface NotionPage {
  id: string;
  url: string;
  title: string;
}

async function notionFetch<T>(accessToken: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Notion API error: ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) message = `Notion API error: ${res.status} — ${err.message}`;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getNotionDatabases(accessToken: string): Promise<NotionDatabase[]> {
  const data = await notionFetch<{
    results: Array<{ id: string; title: Array<{ plain_text: string }> }>;
  }>(accessToken, "/search", {
    method: "POST",
    body: JSON.stringify({
      filter: { value: "database", property: "object" },
      page_size: 100,
    }),
  });
  return data.results.map((db) => ({
    id: db.id,
    name: db.title[0]?.plain_text || "Untitled",
  }));
}

export async function createNotionPage(
  accessToken: string,
  databaseId: string,
  title: string,
  content: string,
): Promise<NotionPage> {
  const data = await notionFetch<{ id: string; url: string }>(accessToken, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: { title: { title: [{ text: { content: title } }] } },
      children: content ? [{ paragraph: { rich_text: [{ text: { content } }] } }] : [],
    }),
  });
  return { id: data.id, url: data.url, title };
}

export async function getNotionPage(accessToken: string, pageId: string): Promise<NotionPage> {
  const data = await notionFetch<{
    id: string;
    url: string;
    properties: Record<string, { type: string; title?: Array<{ plain_text: string }> }>;
  }>(accessToken, `/pages/${pageId}`);
  const titleProp = Object.values(data.properties).find((p) => p.type === "title");
  const title = titleProp?.title?.[0]?.plain_text ?? "Untitled";
  return { id: data.id, url: data.url, title };
}

// Accepts a page ID or Notion URL, normalises to a bare UUID (no hyphens)
export function parseNotionPageInput(input: string): string {
  const trimmed = input.trim();
  // Extract 32-hex-char segment at end of URL: notion.so/Page-Title-{id}
  const urlMatch = trimmed.match(/([0-9a-f]{32})(?:[?#].*)?$/i);
  if (urlMatch?.[1]) return urlMatch[1];
  // Plain UUID with or without hyphens
  return trimmed.replace(/-/g, "");
}
