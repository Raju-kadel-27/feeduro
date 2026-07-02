import { fireStatusSyncIntegrations } from "@features/feedback/server/status-sync";
import { notifyStatusChanged } from "@features/internal/notifications/server/service";
import { dispatchWebhook } from "@features/internal/webhooks/server/dispatch";
import { and, eq } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import { data } from "react-router";
import { z } from "zod";
import { getDb, withRequestDb } from "@/db";
import { feedbackPosts, postActivities } from "@/db/schema";
import { getExecutionContext, waitUntil } from "@/middleware/cloudflare.server";

type SessionActor = { user: { id: string; name: string | null; email: string | null } };

const PostStatusEnum = z.enum([
  "open",
  "reviewing",
  "planned",
  "in-progress",
  "completed",
  "closed",
]);

const UpdateStatusSchema = z.object({
  intent: z.literal("update_status"),
  id: z.string().min(1),
  status: PostStatusEnum,
});

export async function handleUpdateStatus(
  organizationId: string,
  session: SessionActor,
  role: string,
  rawBody: unknown,
  context: AppLoadContext,
) {
  if (role !== "admin") return data({ error: "Only admins can update status" }, { status: 403 });

  const parsed = UpdateStatusSchema.safeParse(rawBody);
  if (!parsed.success) return data({ error: "Invalid payload" }, { status: 400 });
  const { id, status: newStatus } = parsed.data;

  const db = getDb();
  const existing = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, id), eq(feedbackPosts.organizationId, organizationId)),
    columns: { status: true, title: true },
  });

  await db
    .update(feedbackPosts)
    .set({ status: newStatus })
    .where(and(eq(feedbackPosts.id, id), eq(feedbackPosts.organizationId, organizationId)));

  if (!existing || existing.status === newStatus) return data({ success: true });

  try {
    await db.insert(postActivities).values({
      postId: id,
      organizationId,
      userId: session.user.id,
      type: "status_changed",
      oldValue: existing.status,
      newValue: newStatus,
    });
  } catch (err) {
    console.error("[update-status] activity insert failed", err);
  }

  dispatchWebhook(context, organizationId, "feedback.status_changed", {
    id,
    oldStatus: existing.status,
    newStatus,
    changedBy: session.user.id,
  });

  // Notifications are fast (DB inserts only) — await so they complete before
  // the pool is closed, but don't let a failure affect the response.
  try {
    await notifyStatusChanged({
      postId: id,
      postTitle: existing.title,
      oldStatus: existing.status,
      newStatus,
      actorId: session.user.id,
      organizationId,
      actorName: session.user.name ?? session.user.email ?? "Someone",
    });
  } catch (err) {
    console.error("[update-status] notify error", err);
  }

  // Integration syncs hit external APIs — run in background with a fresh DB
  // pool so they don't block the response or share the request's ended pool.
  const ctx = getExecutionContext(context);
  waitUntil(
    context,
    withRequestDb(
      (p) => ctx.waitUntil(p),
      () => fireStatusSyncIntegrations(organizationId, id, newStatus),
    ),
  );

  return data({ success: true });
}
