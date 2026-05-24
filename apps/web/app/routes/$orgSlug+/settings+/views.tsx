import { requireOrgBySlug } from "@features/auth/server/guards";
import { ViewsSettingsPage } from "@features/dashboard/components/views-settings-page";
import { getOrgViews } from "@features/dashboard/server/views.server";
import type { Category, Tag } from "@features/dashboard/types";
import { getOrgCategories } from "@features/feedback/server/categories.server";
import { getBoards } from "@features/feedback/server/queries";
import { getOrgTags } from "@features/feedback/server/tags.server";
import type { Segment } from "@features/segmentation/types";
import { getOrgSegments } from "@features/segmentation/server/service";
import type { Route } from "./+types/views";

export function meta() {
  return [{ title: "Views — Feediyo" }];
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
