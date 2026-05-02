import { requireOrganization } from "@lib/session.server";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { organization } from "@/db/schema";
import type { Route } from "./+types/feedback-settings";

interface FeedbackSettingsMeta {
  enableRoadmap: boolean;
  weeklyDigest: boolean;
}

const DEFAULTS: FeedbackSettingsMeta = {
  enableRoadmap: false,
  weeklyDigest: false,
};

export function parseFeedbackSettings(metadata: string | null): FeedbackSettingsMeta {
  if (!metadata) return DEFAULTS;
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return { ...DEFAULTS, ...((parsed.feedbackSettings as Partial<FeedbackSettingsMeta>) ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

export async function action({ request }: Route.ActionArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();

  const body = (await request.json()) as Partial<FeedbackSettingsMeta>;

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  if (!org) return data({ error: "Organization not found" }, { status: 404 });

  let existingMeta: Record<string, unknown> = {};
  if (org.metadata) {
    try {
      existingMeta = JSON.parse(org.metadata) as Record<string, unknown>;
    } catch {}
  }

  const feedbackSettings: FeedbackSettingsMeta = {
    enableRoadmap: body.enableRoadmap ?? DEFAULTS.enableRoadmap,
    weeklyDigest: body.weeklyDigest ?? DEFAULTS.weeklyDigest,
  };

  await db
    .update(organization)
    .set({ metadata: JSON.stringify({ ...existingMeta, feedbackSettings }) })
    .where(eq(organization.id, organizationId));

  return data({ success: true });
}
