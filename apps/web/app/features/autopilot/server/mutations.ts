import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { autopilotSuggestions, feedbackPosts, postActivities } from "@/db/schema";
import type { SuggestionStatus } from "../types";

export async function createDuplicateSuggestion(params: {
  organizationId: string;
  sourcePostId: string;
  targetPostId: string;
  confidence: "low" | "medium" | "high";
  reason: string;
}) {
  const db = getDb();
  await db.insert(autopilotSuggestions).values({
    organizationId: params.organizationId,
    type: "duplicate",
    status: "pending",
    sourcePostId: params.sourcePostId,
    targetPostId: params.targetPostId,
    confidence: params.confidence,
    reason: params.reason,
  });
}

export async function resolveSuggestion(params: {
  suggestionId: string;
  organizationId: string;
  resolvedByUserId: string;
  status: Extract<SuggestionStatus, "approved" | "dismissed">;
}) {
  const db = getDb();

  const suggestion = await db.query.autopilotSuggestions.findFirst({
    where: and(
      eq(autopilotSuggestions.id, params.suggestionId),
      eq(autopilotSuggestions.organizationId, params.organizationId),
      eq(autopilotSuggestions.status, "pending"),
    ),
    columns: { id: true, type: true, sourcePostId: true, targetPostId: true },
  });

  if (!suggestion) return { error: "Suggestion not found or already resolved" };

  if (params.status === "approved" && suggestion.type === "duplicate" && suggestion.targetPostId) {
    const [sourcePost, targetPost] = await Promise.all([
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, suggestion.sourcePostId),
          eq(feedbackPosts.organizationId, params.organizationId),
        ),
        columns: { id: true, title: true, mergedIntoPostId: true },
      }),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, suggestion.targetPostId),
          eq(feedbackPosts.organizationId, params.organizationId),
        ),
        columns: { id: true, title: true, mergedIntoPostId: true },
      }),
    ]);

    if (!sourcePost || !targetPost) return { error: "Posts not found" };
    if (sourcePost.mergedIntoPostId) return { error: "Source post is already merged" };
    if (targetPost.mergedIntoPostId) return { error: "Target post is already merged" };

    await db.transaction(async (tx) => {
      await tx
        .update(feedbackPosts)
        .set({
          mergedIntoPostId: suggestion.targetPostId,
          mergedAt: new Date(),
          mergedByUserId: params.resolvedByUserId,
        })
        .where(eq(feedbackPosts.id, suggestion.sourcePostId));

      await tx.insert(postActivities).values([
        {
          postId: suggestion.targetPostId!,
          organizationId: params.organizationId,
          userId: params.resolvedByUserId,
          type: "merged",
          newValue: sourcePost.id,
          oldValue: sourcePost.title.slice(0, 95),
        },
        {
          postId: suggestion.sourcePostId,
          organizationId: params.organizationId,
          userId: params.resolvedByUserId,
          type: "merged_into",
          newValue: suggestion.targetPostId!,
          oldValue: targetPost.title.slice(0, 95),
        },
      ]);

      await tx
        .update(autopilotSuggestions)
        .set({
          status: "approved",
          resolvedAt: new Date(),
          resolvedByUserId: params.resolvedByUserId,
        })
        .where(eq(autopilotSuggestions.id, params.suggestionId));
    });

    return { success: true, merged: true, targetPostId: suggestion.targetPostId };
  }

  await db
    .update(autopilotSuggestions)
    .set({
      status: params.status,
      resolvedAt: new Date(),
      resolvedByUserId: params.resolvedByUserId,
    })
    .where(eq(autopilotSuggestions.id, params.suggestionId));

  return { success: true, merged: false };
}
