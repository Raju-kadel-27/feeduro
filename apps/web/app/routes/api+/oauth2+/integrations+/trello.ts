import {
  handleTrelloAction,
  handleTrelloLoader,
} from "@features/internal/integrations/trello/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/trello";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleTrelloLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleTrelloAction(db, request);
}
