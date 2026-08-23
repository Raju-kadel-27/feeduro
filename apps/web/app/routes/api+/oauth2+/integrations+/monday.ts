import {
  handleMondayAction,
  handleMondayLoader,
} from "@features/internal/integrations/monday/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/monday";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleMondayLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleMondayAction(db, request);
}
