import { getDb } from "@/db";
import { feedbackPosts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";

const UpdateRankSchema = z.object({
  intent: z.literal("update_rank"),
  status: z.enum(["open", "reviewing", "planned", "in-progress", "completed", "closed"]),
  orderedIds: z.array(z.string().min(1)).min(1).max(500),
});

export async function handleUpdateRank(organizationId: string, rawBody: unknown) {
  const parsed = UpdateRankSchema.safeParse(rawBody);
  if (!parsed.success) return data({ error: "Invalid payload" }, { status: 400 });
  const { orderedIds } = parsed.data;

  const db = getDb();
  await Promise.all(
    orderedIds.map((id, rank) =>
      db
        .update(feedbackPosts)
        .set({ rank })
        .where(and(eq(feedbackPosts.id, id), eq(feedbackPosts.organizationId, organizationId))),
    ),
  );
  return data({ success: true });
}
