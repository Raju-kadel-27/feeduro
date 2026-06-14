import { requireOrganization } from "@features/auth/server/guards";
import { getBoardSummaries } from "@features/internal/analytics/server/board-summary.server";
import { getTopContributors } from "@features/internal/analytics/server/contributor-rank.server";
import { getSegmentDemand } from "@features/internal/analytics/server/segment-demand.server";
import { getStatusFunnel } from "@features/internal/analytics/server/status-funnel.server";
import { getTopPostsByVotes, getVoteTrends } from "@features/internal/analytics/server/vote-trends.server";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/analytics";

const IntentSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("vote_trends"),
    postId: z.string(),
    days: z.number().int().optional(),
  }),
  z.object({
    intent: z.literal("top_posts"),
    boardId: z.string().optional(),
    limit: z.number().int().optional(),
  }),
  z.object({ intent: z.literal("status_funnel"), boardId: z.string().optional() }),
  z.object({ intent: z.literal("contributors"), limit: z.number().int().optional() }),
  z.object({ intent: z.literal("board_summary") }),
  z.object({
    intent: z.literal("segment_demand"),
    segmentField: z.enum(["plan", "role", "industry", "companySize"]),
    segmentValue: z.string(),
    limit: z.number().int().optional(),
  }),
]);

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");

  if (intent === "board_summary") {
    const summaries = await getBoardSummaries(organizationId);
    return data({ summaries });
  }

  if (intent === "top_posts") {
    const boardId = url.searchParams.get("boardId") ?? undefined;
    const limit = url.searchParams.get("limit");
    const posts = await getTopPostsByVotes(organizationId, boardId, limit ? Number(limit) : 10);
    return data({ posts });
  }

  if (intent === "status_funnel") {
    const boardId = url.searchParams.get("boardId") ?? undefined;
    const funnel = await getStatusFunnel(organizationId, boardId);
    return data({ funnel });
  }

  if (intent === "contributors") {
    const limit = url.searchParams.get("limit");
    const contributors = await getTopContributors(organizationId, limit ? Number(limit) : 10);
    return data({ contributors });
  }

  if (intent === "vote_trends") {
    const postId = url.searchParams.get("postId");
    if (!postId) return data({ error: "postId required" }, { status: 400 });
    const days = url.searchParams.get("days");
    const trends = await getVoteTrends(organizationId, postId, days ? Number(days) : 30);
    if (!trends) return data({ error: "Post not found" }, { status: 404 });
    return data({ trends });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}

export async function action({ request }: Route.ActionArgs) {
  const { organizationId } = await requireOrganization(request);

  const raw = await request.json();
  const parsed = IntentSchema.safeParse(raw);
  if (!parsed.success) {
    return data({ error: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  if (body.intent === "segment_demand") {
    const results = await getSegmentDemand(
      organizationId,
      body.segmentField,
      body.segmentValue,
      body.limit,
    );
    return data({ results });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
