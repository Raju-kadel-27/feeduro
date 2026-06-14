import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts } from "@/db/schema";
import type { CannyPost } from "../schemas/canny";
import { mapCannyStatus } from "./canny-adapter";

const BATCH = 100;

// Insert posts with ON CONFLICT DO NOTHING (dedup via fp_import_dedup_idx).
// Returns Map<cannyPostId, ourPostId> — includes both newly inserted and pre-existing rows.
export async function insertPosts(
  organizationId: string,
  jobId: string,
  posts: CannyPost[],
  boardMap: Map<string, string>,
): Promise<Map<string, string>> {
  if (posts.length === 0) return new Map();
  const db = getDb();

  const values = posts
    .filter((p) => boardMap.has(p.board.id))
    .map((p) => ({
      organizationId,
      boardId: boardMap.get(p.board.id) as string,
      title: p.title,
      description: p.details ?? null,
      // Cast is safe — mapCannyStatus always returns a valid enum value
      status: mapCannyStatus(p.status) as
        | "open"
        | "reviewing"
        | "planned"
        | "in-progress"
        | "completed"
        | "closed",
      voteCount: p.score,
      // Original author stored on the post; they are not a workspace member
      submitterEmail: p.author.email ?? null,
      submitterName: p.author.name,
      isPublicSubmission: true,
      importSource: "canny" as const,
      externalId: p.id,
      originalCreatedAt: new Date(p.created),
      importJobId: jobId,
    }));

  for (let i = 0; i < values.length; i += BATCH) {
    await db.insert(feedbackPosts).values(values.slice(i, i + BATCH)).onConflictDoNothing();
  }

  // Fetch all rows (inserted + pre-existing) for this source to build the ID map
  const externalIds = posts.map((p) => p.id);
  const rows = await db
    .select({ id: feedbackPosts.id, externalId: feedbackPosts.externalId })
    .from(feedbackPosts)
    .where(
      and(
        eq(feedbackPosts.organizationId, organizationId),
        eq(feedbackPosts.importSource, "canny"),
        inArray(feedbackPosts.externalId, externalIds),
      ),
    );

  return new Map(rows.map((r) => [r.externalId as string, r.id]));
}

// Reconcile cached voteCount for a set of posts by counting real vote rows.
// Called after bulk vote insertion so the count is accurate.
export async function reconcileVoteCounts(postIds: string[]): Promise<void> {
  if (postIds.length === 0) return;
  const db = getDb();

  for (let i = 0; i < postIds.length; i += BATCH) {
    const batch = postIds.slice(i, i + BATCH);
    await db.execute(sql`
      UPDATE feedback_posts
      SET vote_count = (SELECT COUNT(*) FROM votes WHERE votes.post_id = feedback_posts.id)
      WHERE id = ANY(${batch})
    `);
  }
}
