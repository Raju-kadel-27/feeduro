import { requireOrganization } from "@features/auth/server/guards";
import { generateCommentSummary } from "@features/internal/autopilot/server/comment-summary.server";
import { getEnv } from "@utils/get-env";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/comment-summary";

const BodySchema = z.object({ postId: z.string().min(1) });

export async function action({ request }: Route.ActionArgs) {
  const { organizationId } = await requireOrganization(request);

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) return data({ error: "postId required" }, { status: 400 });

  const groqApiKey = getEnv().GROQ_API_KEY;
  if (!groqApiKey) return data({ error: "AI not configured" }, { status: 503 });

  try {
    const summary = await generateCommentSummary(body.data.postId, organizationId, groqApiKey);
    return data({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate summary";
    return data({ error: message }, { status: 500 });
  }
}
