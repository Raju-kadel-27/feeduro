import { requireOrganization } from "@features/auth/server/guards";
import {
  getCompanyVotersByPost,
  getOrgSegments,
  getSegmentCountsByPost,
} from "@features/internal/segmentation/server/service";
import { getDb } from "@middleware/cloudflare.server";
import { data } from "react-router";
import type { Route } from "./+types/post-segment-counts";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId) {
    return data({ segmentCounts: {}, otherCount: 0, profiledCount: 0, companies: [] });
  }

  const segments = await getOrgSegments(db, organizationId);
  // The segment breakdown is the primary content — never let the (optional) companies query hide it.
  const [result, companies] = await Promise.all([
    getSegmentCountsByPost(db, organizationId, postId, segments),
    getCompanyVotersByPost(db, organizationId, postId).catch(() => []),
  ]);
  return data({ ...result, companies });
}
