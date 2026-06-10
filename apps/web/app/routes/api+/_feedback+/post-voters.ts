import { data } from "react-router";
import { requireOrganization } from "@features/auth/server/guards";
import { getVoterProfilesByPost } from "@features/segmentation/server/service";
import type { Route } from "./+types/post-voters";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId) return data({ voters: [] });

  const voters = await getVoterProfilesByPost(organizationId, postId, 50);
  return data({ voters });
}
