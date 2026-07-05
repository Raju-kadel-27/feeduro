import { requireOrganization } from "@features/auth/server/guards";
import { getVoterProfilesByPost } from "@features/internal/segmentation/server/service";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/post-voters";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId) return data({ voters: [] });

  const voters = await getVoterProfilesByPost(db, organizationId, postId, 50);
  return data({ voters });
}
