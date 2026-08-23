import { handleZendeskAction, handleZendeskLoader } from "@features/internal/integrations/zendesk/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/zendesk";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleZendeskLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleZendeskAction(db, request);
}
