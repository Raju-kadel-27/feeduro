const TRELLO_API = "https://api.trello.com/1";
const TRELLO_AUTH_URL = "https://trello.com/1/authorize";

export interface TrelloMember {
  id: string;
  username: string;
  fullName: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
}

export interface TrelloList {
  id: string;
  name: string;
}

export interface TrelloCardResult {
  id: string;
  name: string;
  url: string;
  listId: string | null;
  listName: string | null;
  closed: boolean;
}

async function trelloFetch<T>(
  apiKey: string,
  token: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${TRELLO_API}${path}${separator}key=${apiKey}&token=${token}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Trello API error: ${res.status}`;
    try {
      const text = await res.text();
      if (text) message = `Trello API error: ${res.status} — ${text}`;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Trello uses API Key + Token flow. The token is returned directly after user authorization
// (no code exchange step). The orgId is embedded in the return_url to survive the redirect.
export function trelloAuthUrl(apiKey: string, returnUrl: string): string {
  const params = new URLSearchParams({
    expiration: "never",
    name: "Feediyo",
    scope: "read,write",
    response_type: "token",
    key: apiKey,
    return_url: returnUrl,
  });
  return `${TRELLO_AUTH_URL}?${params}`;
}

export async function getTrelloMe(apiKey: string, token: string): Promise<TrelloMember> {
  return trelloFetch<TrelloMember>(apiKey, token, "/members/me?fields=id,username,fullName");
}

export async function getTrelloBoards(apiKey: string, token: string): Promise<TrelloBoard[]> {
  return trelloFetch<TrelloBoard[]>(apiKey, token, "/members/me/boards?filter=open&fields=id,name");
}

export async function getTrelloLists(
  apiKey: string,
  token: string,
  boardId: string,
): Promise<TrelloList[]> {
  return trelloFetch<TrelloList[]>(
    apiKey,
    token,
    `/boards/${boardId}/lists?filter=open&fields=id,name`,
  );
}

interface RawTrelloCard {
  id: string;
  name: string;
  url: string;
  idList: string;
  closed: boolean;
}

function parseCardResult(card: RawTrelloCard, listName: string | null): TrelloCardResult {
  return {
    id: card.id,
    name: card.name,
    url: card.url,
    listId: card.idList ?? null,
    listName,
    closed: card.closed,
  };
}

export async function createTrelloCard(
  apiKey: string,
  token: string,
  listId: string,
  name: string,
  desc?: string,
): Promise<TrelloCardResult> {
  const body: Record<string, string> = { idList: listId, name };
  if (desc) body.desc = desc;

  const card = await trelloFetch<RawTrelloCard>(apiKey, token, "/cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseCardResult(card, null);
}

// Accepts a card ID directly, or extracts it from a Trello URL
// e.g. https://trello.com/c/AbCdEfGh/42-card-title → "AbCdEfGh"
export function parseTrelloCardInput(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/trello\.com\/c\/([a-zA-Z0-9]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed;
}

export async function getTrelloCardById(
  apiKey: string,
  token: string,
  cardId: string,
): Promise<TrelloCardResult> {
  const card = await trelloFetch<RawTrelloCard & { list?: { id: string; name: string } }>(
    apiKey,
    token,
    `/cards/${cardId}?fields=id,name,url,idList,closed&list=true`,
  );
  return parseCardResult(card, card.list?.name ?? null);
}

export async function moveTrelloCardToList(apiKey: string, token: string, cardId: string, listId: string): Promise<void> {
  await trelloFetch(apiKey, token, `/cards/${cardId}`, { method: "PUT", body: JSON.stringify({ idList: listId }) });
}

export async function registerTrelloWebhook(
  apiKey: string,
  token: string,
  boardId: string,
  callbackUrl: string,
): Promise<string> {
  const webhook = await trelloFetch<{ id: string }>(apiKey, token, "/webhooks", {
    method: "POST",
    body: JSON.stringify({
      idModel: boardId,
      callbackURL: callbackUrl,
      description: "Feediyo status sync",
    }),
  });
  return webhook.id;
}

export async function deleteTrelloWebhook(
  apiKey: string,
  token: string,
  webhookId: string,
): Promise<void> {
  await trelloFetch(apiKey, token, `/webhooks/${webhookId}`, { method: "DELETE" });
}

// Trello signs webhooks with HMAC-SHA1 using the API secret.
// Signature = base64(HMAC-SHA1(callbackURL + requestBody, apiSecret))
export async function verifyTrelloWebhook(
  apiSecret: string,
  callbackUrl: string,
  body: string,
  signature: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiSecret),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    );
    const payload = new TextEncoder().encode(body + callbackUrl);
    const sig = await crypto.subtle.sign("HMAC", key, payload);
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return computed === signature;
  } catch {
    return false;
  }
}
