import {
  handleAsanaAction,
  handleAsanaLoader,
} from "@features/internal/integrations/asana/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/asana";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleAsanaLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleAsanaAction(db, request);
}
