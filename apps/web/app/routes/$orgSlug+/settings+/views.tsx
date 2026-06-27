import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgCategories } from "@features/feedback/server/categories";
import { getBoards } from "@features/feedback/server/queries";
import { getOrgTags } from "@features/feedback/server/tags";
import { ViewsSettingsPage } from "@features/internal/dashboard/components/views-settings-page";
import { getOrgViews } from "@features/internal/dashboard/server/views";
import type { Category, Tag } from "@features/internal/dashboard/types";
import { getOrgSegments } from "@features/internal/segmentation/server/service";
import type { Segment } from "@features/internal/segmentation/types";
import type { Route } from "./+types/views";

export function meta() {
  return [{ title: "Views — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const [views, boardsData, tags, categories, segments] = await Promise.all([
    getOrgViews(organizationId),
    getBoards(organizationId),
    getOrgTags(organizationId).catch(() => [] as Tag[]),
    getOrgCategories(organizationId).catch(() => [] as Category[]),
    getOrgSegments(organizationId).catch(() => [] as Segment[]),
  ]);
  return { views, boards: boardsData.boards, tags, categories, segments };
}

export default function Views({ loaderData }: Route.ComponentProps) {
  return <ViewsSettingsPage loaderData={loaderData} />;
}
