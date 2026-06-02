import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { feedbackPosts } from "@/db/schema";

const STATUS_VALUES = ["open", "reviewing", "planned", "in-progress", "completed", "closed"] as const;
type StatusValue = (typeof STATUS_VALUES)[number];

export const ListRoadmapSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
});

export const UpdateRoadmapPostSchema = z
  .object({
    status: z.enum(STATUS_VALUES).optional(),
    rank: z.number().nullable().optional(),
  })
  .refine((d) => d.status !== undefined || d.rank !== undefined, {
    message: "At least one of status or rank must be provided",
  });

const ROADMAP_COLS = {
  id: true,
  title: true,
  description: true,
  status: true,
  rank: true,
  voteCount: true,
  boardId: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listRoadmap(organizationId: string, status?: StatusValue) {
  const db = getDb();

  const rows = await db
    .select(ROADMAP_COLS)
    .from(feedbackPosts)
    .where(
      and(
        eq(feedbackPosts.organizationId, organizationId),
        isNull(feedbackPosts.mergedIntoPostId),
        status ? eq(feedbackPosts.status, status) : undefined,
      ),
    )
    .orderBy(sql`${feedbackPosts.rank} asc nulls last`, desc(feedbackPosts.createdAt));

  const empty: Record<StatusValue, typeof rows> = {
    open: [], reviewing: [], planned: [], "in-progress": [], completed: [], closed: [],
  };

  const columns = rows.reduce<Record<StatusValue, typeof rows>>((acc, row) => {
    acc[row.status as StatusValue].push(row);
    return acc;
  }, empty);

  return {
    data: { columns: status ? ({ [status]: columns[status] } as Partial<typeof columns>) : columns },
  };
}

export async function updateRoadmapPost(
  organizationId: string,
  postId: string,
  input: z.infer<typeof UpdateRoadmapPostSchema>,
) {
  const db = getDb();

  const existing = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!existing) return null;

  const set: Record<string, unknown> = {};
  if (input.status !== undefined) set.status = input.status;
  if (input.rank !== undefined) set.rank = input.rank;

  const [updated] = await db
    .update(feedbackPosts)
    .set(set)
    .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)))
    .returning({
      id: feedbackPosts.id,
      status: feedbackPosts.status,
      rank: feedbackPosts.rank,
      updatedAt: feedbackPosts.updatedAt,
    });

  return updated;
}
