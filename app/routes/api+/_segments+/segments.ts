import { SegmentActionSchema } from "@features/segmentation/schemas/segment";
import {
  createSegment,
  deleteSegment,
  getOrgSegments,
  getSegmentMemberCounts,
  updateSegment,
} from "@features/segmentation/server/service";
import { requireOrganization } from "@features/auth/server/guards";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { member } from "@/db/schema";

import type { Route } from "./+types/segments";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const segmentList = await getOrgSegments(organizationId);
  const memberCounts = await getSegmentMemberCounts(organizationId, segmentList);
  const segments = segmentList.map((s) => ({ ...s, memberCount: memberCounts[s.id] ?? 0 }));
  return data({ segments });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const db = getDb();

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
      organizationId,
      action.name,
      action.color ?? "#6366f1",
      action.filters,
    );
    const [segment] = await getOrgSegments(organizationId).then((s) =>
      s.filter((x) => x.id === id),
    );
    return data({ success: true, segment });
  }

  if (action.intent === "update") {
    await updateSegment(organizationId, action.id, {
      name: action.name,
      color: action.color,
      filters: action.filters,
    });
    return data({ success: true });
  }

  if (action.intent === "delete") {
    await deleteSegment(organizationId, action.id);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
