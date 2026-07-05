import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, sql } from "drizzle-orm";
import { data } from "react-router";
import { feedbackBoards, feedbackPosts } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/boards";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const [boards, planLimits, counts, statusRows] = await Promise.all([
    db.query.feedbackBoards.findMany({
      where: eq(feedbackBoards.organizationId, organizationId),
      orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
    }),
    getOrgPlanLimits(db, organizationId),
    db
      .select({
        boardId: feedbackPosts.boardId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(feedbackPosts)
      .where(eq(feedbackPosts.organizationId, organizationId))
      .groupBy(feedbackPosts.boardId),
    db
      .select({
        status: feedbackPosts.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(feedbackPosts)
      .where(eq(feedbackPosts.organizationId, organizationId))
      .groupBy(feedbackPosts.status),
  ]);

  const countMap = Object.fromEntries(counts.map((r) => [r.boardId, r.count]));
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));

  return data({
    boards: boards.map((b) => ({ ...b, postCount: countMap[b.id] ?? 0 })),
    limit: planLimits.boards,
    statusCounts,
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  const body = (await request.json()) as {
    intent: string;
    [key: string]: unknown;
  };

  if (body.intent === "create") {
    await requirePermission(db, organizationId, session.user.id, { board: ["create"] });

    const name = (body.name as string)?.trim();
    if (!name) return data({ error: "Name is required" }, { status: 400 });

    const [existing, planLimits] = await Promise.all([
      db.query.feedbackBoards.findMany({
        where: eq(feedbackBoards.organizationId, organizationId),
        columns: { id: true },
      }),
      getOrgPlanLimits(db, organizationId),
    ]);

    const { boards: boardLimit } = planLimits;
    if (boardLimit !== -1 && existing.length >= boardLimit) {
      return data(
        {
          error: `Your plan allows up to ${boardLimit} boards. Upgrade to create more.`,
        },
        { status: 403 },
      );
    }

    const baseSlug = slugify(name) || createId().substring(0, 16);
    const slugExists = await db.query.feedbackBoards.findFirst({
      where: and(
        eq(feedbackBoards.organizationId, organizationId),
        eq(feedbackBoards.slug, baseSlug),
      ),
    });
    const slug = slugExists ? `${baseSlug}-${createId().substring(0, 6)}` : baseSlug;

    const [board] = await db
      .insert(feedbackBoards)
      .values({
        organizationId,
        name,
        slug,
        description: (body.description as string)?.trim() || null,
        visibility: (body.visibility as "public" | "private") ?? "public",
        isDefault: false,
        createdBy: session.user.id,
      })
      .returning({ id: feedbackBoards.id });

    return data({ success: true, id: board.id, slug });
  }

  if (body.intent === "update") {
    await requirePermission(db, organizationId, session.user.id, { board: ["update"] });

    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    const name = (body.name as string)?.trim();
    if (!name) return data({ error: "Name is required" }, { status: 400 });

    await db
      .update(feedbackBoards)
      .set({
        name,
        description: (body.description as string)?.trim() || null,
        visibility: (body.visibility as "public" | "private") ?? "public",
      })
      .where(and(eq(feedbackBoards.id, id), eq(feedbackBoards.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "update-visibility") {
    await requirePermission(db, organizationId, session.user.id, { board: ["update"] });

    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });
    const visibility = body.visibility as "public" | "private";
    if (!visibility) return data({ error: "Visibility is required" }, { status: 400 });

    await db
      .update(feedbackBoards)
      .set({ visibility })
      .where(and(eq(feedbackBoards.id, id), eq(feedbackBoards.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "delete") {
    await requirePermission(db, organizationId, session.user.id, { board: ["delete"] });

    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    const board = await db.query.feedbackBoards.findFirst({
      where: and(eq(feedbackBoards.id, id), eq(feedbackBoards.organizationId, organizationId)),
    });

    if (!board) return data({ error: "Board not found" }, { status: 404 });
    if (board.isDefault) return data({ error: "Cannot delete the default board" }, { status: 400 });

    const defaultBoard = await db.query.feedbackBoards.findFirst({
      where: and(
        eq(feedbackBoards.organizationId, organizationId),
        eq(feedbackBoards.isDefault, true),
      ),
    });

    if (defaultBoard) {
      await db
        .update(feedbackPosts)
        .set({ boardId: defaultBoard.id })
        .where(
          and(eq(feedbackPosts.boardId, id), eq(feedbackPosts.organizationId, organizationId)),
        );
    }

    await db
      .delete(feedbackBoards)
      .where(and(eq(feedbackBoards.id, id), eq(feedbackBoards.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "update-smart-replies") {
    await requirePermission(db, organizationId, session.user.id, { board: ["update"] });

    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    const enabled = body.enabled as boolean;
    const instructions = (body.instructions as string | undefined)?.trim() || null;

    await db
      .update(feedbackBoards)
      .set({ smartRepliesEnabled: enabled, smartRepliesInstructions: instructions })
      .where(and(eq(feedbackBoards.id, id), eq(feedbackBoards.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "update-anonymize-users") {
    await requirePermission(db, organizationId, session.user.id, { board: ["update"] });

    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });
    const anonymizeUsers = body.anonymizeUsers as boolean;

    await db
      .update(feedbackBoards)
      .set({ anonymizeUsers })
      .where(and(eq(feedbackBoards.id, id), eq(feedbackBoards.organizationId, organizationId)));

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
