import type { Db } from "@/db";
import { comments } from "@/db/schema";
import type { CannyComment } from "../schemas/canny";

const BATCH = 100;

type CommentRow = typeof comments.$inferInsert;

function buildRows(
  organizationId: string,
  cannyComments: CannyComment[],
  postMap: Map<string, string>,
  profileMap: Map<string, string>,
  // cannyId → ourId for already-inserted parent comments
  parentMap: Map<string, string>,
): CommentRow[] {
  return cannyComments
    .filter(
      (c) =>
        postMap.has(c.postID) &&
        c.author.email &&
        profileMap.has(c.author.email),
    )
    .map((c) => ({
      organizationId,
      postId: postMap.get(c.postID) as string,
      commenterProfileId: profileMap.get(c.author.email as string) as string,
      body: c.value,
      importSource: "canny" as const,
      externalId: c.id,
      parentId: c.parentID ? (parentMap.get(c.parentID) ?? null) : null,
      createdAt: new Date(c.created),
    }));
}

async function insertBatch(db: Db, rows: CommentRow[]): Promise<Map<string, string>> {
  const externalToOur = new Map<string, string>();
  if (rows.length === 0) return externalToOur;

  for (let i = 0; i < rows.length; i += BATCH) {
    const result = await db
      .insert(comments)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoNothing() // dedup via comment_import_dedup_idx
      .returning({ id: comments.id, externalId: comments.externalId });
    for (const r of result) {
      if (r.externalId) externalToOur.set(r.externalId, r.id);
    }
  }
  return externalToOur;
}

// Insert comments in two passes: top-level first, then replies.
// This ensures parentId can be resolved for nested comments.
// Returns total count of inserted rows.
export async function insertComments(
  db: Db,
  organizationId: string,
  cannyComments: CannyComment[],
  postMap: Map<string, string>,
  profileMap: Map<string, string>,
): Promise<number> {
  const topLevel = cannyComments.filter((c) => !c.parentID);
  const replies = cannyComments.filter((c) => !!c.parentID);

  // Pass 1: top-level comments
  const topRows = buildRows(organizationId, topLevel, postMap, profileMap, new Map());
  const parentMap = await insertBatch(db, topRows);

  // Pass 2: replies with resolved parentIds
  const replyRows = buildRows(organizationId, replies, postMap, profileMap, parentMap);
  const replyMap = await insertBatch(db, replyRows);

  return parentMap.size + replyMap.size;
}
