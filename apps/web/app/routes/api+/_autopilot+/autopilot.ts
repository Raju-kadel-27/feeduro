import { requireOrganization } from "@features/auth/server/guards";
import { ResolveAutopilotSuggestionSchema } from "@features/internal/autopilot/schemas";
import { resolveSuggestion } from "@features/internal/autopilot/server/mutations";
import { getPendingSuggestions } from "@features/internal/autopilot/server/queries";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/autopilot";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const suggestions = await getPendingSuggestions(organizationId);
  return data({ suggestions });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  const body = ResolveAutopilotSuggestionSchema.safeParse(await request.json());
  if (!body.success) return data({ error: "Invalid request" }, { status: 400 });

  const result = await resolveSuggestion({
    suggestionId: body.data.suggestionId,
    organizationId,
    resolvedByUserId: session.user.id,
    status: body.data.intent === "approve" ? "approved" : "dismissed",
  });

  if ("error" in result) return data({ error: result.error }, { status: 400 });

  return data(result);
}
