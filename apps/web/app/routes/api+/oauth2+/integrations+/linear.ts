import {
  handleLinearAction,
  handleLinearLoader,
} from "@features/internal/integrations/linear/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/linear";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleLinearLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleLinearAction(db, request);
}
