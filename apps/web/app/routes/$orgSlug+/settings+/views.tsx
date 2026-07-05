import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgCategories } from "@features/feedback/server/categories";
import { getBoards } from "@features/feedback/server/queries";
import { getOrgTags } from "@features/feedback/server/tags";
import { ViewsSettingsPage } from "@features/internal/dashboard/components/views-settings-page";
import { getOrgViews } from "@features/internal/dashboard/server/views";
import type { Category, Tag } from "@features/internal/dashboard/types";
import { getOrgSegments } from "@features/internal/segmentation/server/service";
import type { Segment } from "@features/internal/segmentation/types";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/views";

export function meta() {
  return [{ title: "Views — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const [views, boardsData, tags, categories, segments] = await Promise.all([
    getOrgViews(db, organizationId),
    getBoards(db, organizationId),
    getOrgTags(db, organizationId).catch(() => [] as Tag[]),
    getOrgCategories(db, organizationId).catch(() => [] as Category[]),
    getOrgSegments(db, organizationId).catch(() => [] as Segment[]),
  ]);
  return { views, boards: boardsData.boards, tags, categories, segments };
}

export default function Views({ loaderData }: Route.ComponentProps) {
  return <ViewsSettingsPage loaderData={loaderData} />;
}
