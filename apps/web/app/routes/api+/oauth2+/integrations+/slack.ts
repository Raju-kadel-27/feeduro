import {
  handleSlackAction,
  handleSlackLoader,
} from "@features/internal/integrations/slack/server/oauth-handler";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/slack";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleSlackLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleSlackAction(db, request);
}
