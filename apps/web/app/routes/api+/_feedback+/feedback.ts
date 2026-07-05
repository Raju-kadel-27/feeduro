import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { handleCreatePost } from "@features/feedback/server/create-post";
import { assignPostOwner } from "@features/feedback/server/owner";
import { handleGetPostDetail } from "@features/feedback/server/post-detail-loader";
import { handleGetPostList } from "@features/feedback/server/post-list-query";
import { handleUpdateRank } from "@features/feedback/server/update-rank";
import { handleUpdateStatus } from "@features/feedback/server/update-status";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { feedbackPosts, member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/feedback";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");

  if (postId) return handleGetPostDetail(db, organizationId, postId, session.user.id);

  return handleGetPostList(db, organizationId, session.user.id, {
    boardId: url.searchParams.get("boardId"),
    status: url.searchParams.get("status"),
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  const rawBody: unknown = await request.json();

  const base = z.object({ intent: z.string() }).safeParse(rawBody);
  if (!base.success) return data({ error: "Invalid request" }, { status: 400 });

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    columns: { role: true },
  });
  const role = memberRecord?.role ?? "member";

  switch (base.data.intent) {
    case "create":
      return handleCreatePost(db, organizationId, session, role, rawBody, context);
    case "update_status":
      return handleUpdateStatus(db, organizationId, session, role, rawBody, context);
    case "update_rank":
      return handleUpdateRank(db, organizationId, rawBody);
    case "assign_owner": {
      await requirePermission(db, organizationId, session.user.id, { feedback: ["update"] });
      const parsed = z
        .object({ id: z.string().min(1), ownerId: z.string().nullable().optional() })
        .safeParse(rawBody);
      if (!parsed.success) return data({ error: "Post id is required" }, { status: 400 });
      const result = await assignPostOwner(db, {
        postId: parsed.data.id,
        organizationId,
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? "Someone",
        newOwnerId: parsed.data.ownerId ?? null,
      });
      if (result.error) return data({ error: result.error }, { status: 400 });
      return data({ success: true });
    }
    case "delete": {
      if (role !== "admin") return data({ error: "Forbidden" }, { status: 403 });
      const parsed = z.object({ id: z.string().min(1) }).safeParse(rawBody);
      if (!parsed.success) return data({ error: "Post id required" }, { status: 400 });
      await db
        .delete(feedbackPosts)
        .where(and(eq(feedbackPosts.id, parsed.data.id), eq(feedbackPosts.organizationId, organizationId)));
      return data({ success: true });
    }
    default:
      return data({ error: "Unknown intent" }, { status: 400 });
  }
}
