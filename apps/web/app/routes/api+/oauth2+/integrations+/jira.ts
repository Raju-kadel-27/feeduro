import {
  handleJiraAction,
  handleJiraLoader,
} from "@features/internal/integrations/jira/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/jira";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleJiraLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleJiraAction(db, request);
}
