import { fireAutoCreateIntegrations } from "@features/feedback/server/post-auto-create";
import { triggerSmartReply } from "@features/feedback/server/smart-replies";
import { runDuplicateDetection } from "@features/internal/autopilot/server/service";
import { notifyNewPost } from "@features/internal/notifications/server/service";
import { dispatchWebhook } from "@features/internal/webhooks/server/dispatch";
import { getEnv } from "@utils/get-env";
import type { AppLoadContext } from "react-router";
import { data } from "react-router";
import { z } from "zod";
import { getDb, withRequestDb } from "@/db";
import { feedbackPosts } from "@/db/schema";
import { getExecutionContext, waitUntil } from "@/middleware/cloudflare.server";

type SessionActor = { user: { id: string; name: string | null; email: string | null } };

const CreatePostSchema = z.object({
  intent: z.literal("create"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  boardId: z.string().min(1, "Board is required"),
  categoryId: z.string().optional(),
});

export async function handleCreatePost(
  organizationId: string,
  session: SessionActor,
  role: string,
  rawBody: unknown,
  context: AppLoadContext,
) {
  if (role === "viewer") return data({ error: "Viewers cannot create feedback" }, { status: 403 });

  const parsed = CreatePostSchema.safeParse(rawBody);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }
  const { title, description, boardId, categoryId } = parsed.data;

  const db = getDb();
  const [post] = await db
    .insert(feedbackPosts)
    .values({ organizationId, boardId, title, description, categoryId, createdBy: session.user.id })
    .returning({
      id: feedbackPosts.id,
      title: feedbackPosts.title,
      boardId: feedbackPosts.boardId,
      status: feedbackPosts.status,
      createdAt: feedbackPosts.createdAt,
    });

  dispatchWebhook(context, organizationId, "feedback.created", {
    id: post.id,
    title: post.title,
    description: description ?? null,
    boardId: post.boardId,
    status: post.status,
    createdBy: session.user.id,
    source: "internal",
    createdAt: post.createdAt,
  });

  // Notifications are fast (DB inserts only) — await so they complete before
  // the pool is closed, but don't let a failure affect the response.
  try {
    await notifyNewPost({
      postId: post.id,
      postTitle: post.title,
      actorId: session.user.id,
      organizationId,
      actorName: session.user.name ?? session.user.email ?? "Someone",
    });
  } catch (err) {
    console.error("[create-post] notify error", err);
  }

  // AI features and integration auto-creates hit external APIs — run in
  // background with a fresh DB pool so they don't block the response.
  const ctx = getExecutionContext(context);
  waitUntil(
    context,
    withRequestDb(
      (p) => ctx.waitUntil(p),
      async () => {
        const { GROQ_API_KEY } = getEnv();
        if (GROQ_API_KEY) {
          const postData = {
            id: post.id,
            title: post.title,
            description: description ?? null,
            boardId: post.boardId,
            organizationId,
          };
          await Promise.allSettled([
            triggerSmartReply(db, postData, GROQ_API_KEY).catch((err) =>
              console.error("[smart-reply]", err),
            ),
            runDuplicateDetection(postData, GROQ_API_KEY).catch((err) =>
              console.error("[duplicate-detection]", err),
            ),
          ]);
        }
        await fireAutoCreateIntegrations(
          organizationId,
          { id: post.id, title: post.title, description: description ?? null },
          session.user.id,
        );
      },
    ),
  );

  return data({ success: true, id: post.id });
}
