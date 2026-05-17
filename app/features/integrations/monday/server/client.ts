const MONDAY_API = "https://api.monday.com/v2";

export interface MondayAccount {
  id: string;
  name: string;
}

export interface MondayBoard {
  id: string;
  name: string;
}

export interface MondayGroup {
  id: string;
  title: string;
}

export interface MondayItemResult {
  id: string;
  name: string;
  url: string;
  groupId: string | null;
  groupTitle: string | null;
  state: string;
}

async function mondayGraphQL<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "API-Version": "2023-10",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    let message = `Monday.com API error: ${res.status}`;
    try {
      const err = (await res.json()) as { error_message?: string };
      if (err.error_message) message = `Monday.com API error: ${res.status} — ${err.error_message}`;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Monday.com API error: ${json.errors[0].message}`);
  }
  return json.data as T;
}

export async function getMondayMe(
  accessToken: string,
): Promise<{ id: string; name: string; account: MondayAccount }> {
  const data = await mondayGraphQL<{
    me: { id: string; name: string; account: { id: string; name: string } };
  }>(accessToken, `{ me { id name account { id name } } }`);
  return data.me;
}

export async function getMondayBoards(accessToken: string): Promise<MondayBoard[]> {
  const data = await mondayGraphQL<{ boards: MondayBoard[] }>(
    accessToken,
    `{ boards(limit: 100, order_by: created_at) { id name } }`,
  );
  return data.boards ?? [];
}

export async function getMondayGroups(
  accessToken: string,
  boardId: string,
): Promise<MondayGroup[]> {
  const data = await mondayGraphQL<{ boards: Array<{ groups: MondayGroup[] }> }>(
    accessToken,
    `{ boards(ids: [${boardId}]) { groups { id title } } }`,
  );
  return data.boards?.[0]?.groups ?? [];
}

interface RawMondayItem {
  id: string;
  name: string;
  state: string;
  board: { id: string };
  group: { id: string; title: string } | null;
}

function buildItemUrl(boardId: string, itemId: string): string {
  return `https://app.monday.com/boards/${boardId}/pulses/${itemId}`;
}

function parseItemResult(item: RawMondayItem): MondayItemResult {
  return {
    id: item.id,
    name: item.name,
    state: item.state,
    url: buildItemUrl(item.board.id, item.id),
    groupId: item.group?.id ?? null,
    groupTitle: item.group?.title ?? null,
  };
}

export async function createMondayItem(
  accessToken: string,
  boardId: string,
  groupId: string | undefined,
  name: string,
): Promise<MondayItemResult> {
  const groupArg = groupId ? `, group_id: "${groupId}"` : "";
  const data = await mondayGraphQL<{ create_item: RawMondayItem }>(
    accessToken,
    `mutation {
      create_item(board_id: ${boardId}${groupArg}, item_name: ${JSON.stringify(name)}) {
        id name state board { id } group { id title }
      }
    }`,
  );
  return parseItemResult(data.create_item);
}

// Accepts an item ID directly, or extracts it from a Monday.com URL
// e.g. https://app.monday.com/boards/123/pulses/456 → "456"
export function parseMondayItemInput(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/monday\.com\/boards\/\d+\/pulses\/(\d+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed;
}

export async function getMondayItemById(
  accessToken: string,
  itemId: string,
): Promise<MondayItemResult> {
  const data = await mondayGraphQL<{ items: RawMondayItem[] }>(
    accessToken,
    `{ items(ids: [${itemId}]) { id name state board { id } group { id title } } }`,
  );
  const item = data.items?.[0];
  if (!item) throw new Error(`Monday.com item ${itemId} not found`);
  return parseItemResult(item);
}

export async function registerMondayWebhook(
  accessToken: string,
  boardId: string,
  targetUrl: string,
  event: "change_status_column_value" | "delete_pulse",
): Promise<string> {
  const data = await mondayGraphQL<{ create_webhook: { id: string } }>(
    accessToken,
    `mutation {
      create_webhook(board_id: ${boardId}, url: ${JSON.stringify(targetUrl)}, event: ${event}) {
        id
      }
    }`,
  );
  return data.create_webhook.id;
}

export async function deleteMondayWebhook(
  accessToken: string,
  webhookId: string,
): Promise<void> {
  await mondayGraphQL(
    accessToken,
    `mutation { delete_webhook(id: ${webhookId}) { id } }`,
  );
}
