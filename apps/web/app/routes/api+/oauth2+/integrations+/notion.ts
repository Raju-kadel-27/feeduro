import { handleNotionAction, handleNotionLoader } from "@features/internal/integrations/notion/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/notion";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleNotionLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleNotionAction(db, request);
}
