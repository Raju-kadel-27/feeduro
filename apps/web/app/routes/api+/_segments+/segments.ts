import { requireOrganization } from "@features/auth/server/guards";
import { SegmentActionSchema, SegmentFiltersSchema } from "@features/internal/segmentation/schemas/segment";
import {
  createSegment,
  deleteSegment,
  getOrgSegments,
  getSegmentMemberCounts,
  updateSegment,
} from "@features/internal/segmentation/server/service";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { member, segmentsSetup } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/segments";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const url = new URL(request.url);
  const filtersParam = url.searchParams.get("filters");

  if (filtersParam) {
    let raw: unknown;
    try {
      raw = JSON.parse(filtersParam);
    } catch {
      return data({ count: 0 });
    }
    const parsed = SegmentFiltersSchema.safeParse(raw);
    if (!parsed.success) return data({ count: 0 });
    const counts = await getSegmentMemberCounts(db, organizationId, [{ id: "preview", filters: parsed.data }]);
    return data({ count: counts.preview ?? 0 });
  }

  const segmentList = await getOrgSegments(db, organizationId);
  const memberCounts = await getSegmentMemberCounts(db, organizationId, segmentList);
  const segments = segmentList.map((s) => ({ ...s, memberCount: memberCounts[s.id] ?? 0 }));
  return data({ segments });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    columns: { role: true },
  });
  if (memberRecord?.role !== "admin") {
    return data({ error: "Only admins can manage segments" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SegmentActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const action = parsed.data;

  if (action.intent === "create") {
    const id = await createSegment(
      db,
      organizationId,
      action.name,
      action.color ?? "#6366f1",
      action.filters,
    );
    const [segment] = await getOrgSegments(db, organizationId).then((s) =>
      s.filter((x) => x.id === id),
    );
    return data({ success: true, segment });
  }

  if (action.intent === "update") {
    await updateSegment(db, organizationId, action.id, {
      name: action.name,
      color: action.color,
      filters: action.filters,
    });
    return data({ success: true });
  }

  if (action.intent === "delete") {
    await deleteSegment(db, organizationId, action.id);
    return data({ success: true });
  }

  if (action.intent === "skip-wizard") {
    await db
      .insert(segmentsSetup)
      .values({ organizationId, wizardSkipped: true, wizardDraft: null })
      .onConflictDoUpdate({
        target: segmentsSetup.organizationId,
        set: { wizardSkipped: true, wizardDraft: null },
      });
    return data({ success: true });
  }

  if (action.intent === "save-draft") {
    await db
      .insert(segmentsSetup)
      .values({ organizationId, wizardDraft: action.draft })
      .onConflictDoUpdate({
        target: segmentsSetup.organizationId,
        set: { wizardDraft: action.draft },
      });
    return data({ success: true });
  }

  if (action.intent === "clear-draft") {
    await db
      .insert(segmentsSetup)
      .values({ organizationId, wizardDraft: null })
      .onConflictDoUpdate({
        target: segmentsSetup.organizationId,
        set: { wizardDraft: null },
      });
    return data({ success: true });
  }

  if (action.intent === "dismiss-guide") {
    await db
      .insert(segmentsSetup)
      .values({ organizationId, guideDismissed: true })
      .onConflictDoUpdate({
        target: segmentsSetup.organizationId,
        set: { guideDismissed: true },
      });
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
