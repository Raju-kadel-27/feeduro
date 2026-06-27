import { requireOrganization } from "@features/auth/server/guards";
import {
  getOrgSegments,
  getSegmentCountsByPost,
} from "@features/internal/segmentation/server/service";
import { data } from "react-router";
import type { Route } from "./+types/post-segment-counts";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId) return data({ segmentCounts: {}, otherCount: 0, profiledCount: 0 });

  const segments = await getOrgSegments(organizationId);
  const result = await getSegmentCountsByPost(organizationId, postId, segments);
  return data(result);
}
