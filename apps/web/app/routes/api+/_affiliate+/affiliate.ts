import { requireOrganization } from "@features/auth/server/guards";
import {
  getAffiliateStats,
  joinAffiliateProgram,
  requestPayout,
} from "@features/internal/affiliate/server/service";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/affiliate";

// GET /api/affiliate — return the caller's affiliate stats (or null if not enrolled)
export async function loader({ request }: Route.LoaderArgs) {
  const { session } = await requireOrganization(request);
  const stats = await getAffiliateStats(session.user.id);
  return data(stats);
}

const joinSchema = z.object({ action: z.literal("join") });
const payoutSchema = z.object({
  action: z.literal("request_payout"),
  payoutDetails: z.string().min(1, "Payment details are required"),
});
const bodySchema = z.discriminatedUnion("action", [joinSchema, payoutSchema]);

// POST /api/affiliate — join the program or request a payout
export async function action({ request }: Route.ActionArgs) {
  const { session } = await requireOrganization(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.action === "join") {
    const result = await joinAffiliateProgram(session.user.id);
    return data(result);
  }

  const result = await requestPayout(session.user.id, parsed.data.payoutDetails);
  if (result.error) return data({ error: result.error }, { status: 400 });
  return data({ ok: true });
}
