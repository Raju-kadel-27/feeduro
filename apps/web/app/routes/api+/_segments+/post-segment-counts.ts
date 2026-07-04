import { requireOrganization } from "@features/auth/server/guards";
import {
  getCompanyVotersByPost,
  getOrgSegments,
  getSegmentCountsByPost,
} from "@features/internal/segmentation/server/service";
import { data } from "react-router";
import type { Route } from "./+types/post-segment-counts";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId) {
    return data({ segmentCounts: {}, otherCount: 0, profiledCount: 0, companies: [] });
  }

  const segments = await getOrgSegments(organizationId);
  // The segment breakdown is the primary content — never let the (optional) companies query hide it.
  const [result, companies] = await Promise.all([
    getSegmentCountsByPost(organizationId, postId, segments),
    getCompanyVotersByPost(organizationId, postId).catch(() => []),
  ]);
  return data({ ...result, companies });
}
