import { handleHubSpotAction, handleHubSpotLoader } from "@features/internal/integrations/hubspot/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/hubspot";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleHubSpotLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleHubSpotAction(db, request);
}
