import { requireOrganization } from "@features/auth/server/guards";
import { searchFeedbackPosts } from "@features/feedback/server/search";
import { data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/search";

const querySchema = z.object({
  q: z.string().min(1).max(200),
});

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const url = new URL(request.url);

  const parse = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parse.success) return data({ results: [] });

  const results = await searchFeedbackPosts(organizationId, parse.data.q);
  return data({ results });
}
