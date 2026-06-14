import { z } from "zod";
import {
  type CannyBoard,
  CannyBoardListSchema,
  type CannyComment,
  CannyCommentListSchema,
  type CannyPost,
  CannyPostListSchema,
  type CannyVote,
  CannyVoteListSchema,
} from "../schemas/canny";

const BASE = "https://canny.io/api/v1";
const PAGE_SIZE = 100;

async function cannyPost<T>(
  path: string,
  apiKey: string,
  params: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, ...params }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[import] Canny ${path} returned ${res.status}: ${body}`);
  }
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error(`[import] Canny ${path} response shape mismatch: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function paginate<T>(
  fetcher: (skip: number) => Promise<{ items: T[]; hasMore: boolean }>,
): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await fetcher(skip);
    all.push(...page.items);
    hasMore = page.hasMore;
    skip += PAGE_SIZE;
  }
  return all;
}

export async function fetchBoards(apiKey: string): Promise<CannyBoard[]> {
  const res = await cannyPost("boards/list", apiKey, {}, CannyBoardListSchema);
  return res.boards;
}

export async function fetchPostsByBoard(apiKey: string, boardID: string): Promise<CannyPost[]> {
  return paginate(async (skip) => {
    const res = await cannyPost(
      "posts/list",
      apiKey,
      { boardID, limit: PAGE_SIZE, skip },
      CannyPostListSchema,
    );
    return { items: res.posts, hasMore: res.hasMore };
  });
}

export async function fetchVotesByBoard(apiKey: string, boardID: string): Promise<CannyVote[]> {
  return paginate(async (skip) => {
    const res = await cannyPost(
      "votes/list",
      apiKey,
      { boardID, limit: PAGE_SIZE, skip },
      CannyVoteListSchema,
    );
    return { items: res.votes, hasMore: res.hasMore };
  });
}

export async function fetchCommentsByBoard(
  apiKey: string,
  boardID: string,
): Promise<CannyComment[]> {
  return paginate(async (skip) => {
    const res = await cannyPost(
      "comments/list",
      apiKey,
      { boardID, limit: PAGE_SIZE, skip },
      CannyCommentListSchema,
    );
    return { items: res.comments, hasMore: res.hasMore };
  });
}
