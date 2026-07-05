import { notifyAutopilotDuplicate } from "@features/internal/notifications/server/service";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackPosts } from "@/db/schema";
import { detectDuplicate } from "./duplicate-detection";
import { createDuplicateSuggestion } from "./mutations";

interface NewPost {
  id: string;
  title: string;
  description: string | null;
  boardId: string;
  organizationId: string;
}

export async function runDuplicateDetection(db: Db, post: NewPost, apiKey: string): Promise<void> {
  const existingPosts = await db.query.feedbackPosts.findMany({
    where: and(
      eq(feedbackPosts.organizationId, post.organizationId),
      isNull(feedbackPosts.mergedIntoPostId),
      inArray(feedbackPosts.status, ["open", "reviewing", "planned", "in-progress"]),
    ),
    columns: { id: true, title: true, description: true },
    orderBy: desc(feedbackPosts.createdAt),
    limit: 100,
  });

  const candidates = existingPosts.filter((p) => p.id !== post.id);
  if (candidates.length === 0) return;

  const result = await detectDuplicate(
    { id: post.id, title: post.title, description: post.description },
    candidates,
    apiKey,
  );

  if (!result) return;

  const matchedPost = candidates.find((p) => p.id === result.matchedPostId);

  await Promise.all([
    createDuplicateSuggestion(db, {
      organizationId: post.organizationId,
      sourcePostId: post.id,
      targetPostId: result.matchedPostId!,
      confidence: result.confidence,
      reason: result.reason,
    }),
    notifyAutopilotDuplicate({
      sourcePostId: post.id,
      sourcePostTitle: post.title,
      targetPostTitle: matchedPost?.title ?? "",
      confidence: result.confidence,
      organizationId: post.organizationId,
    }),
  ]);
}
