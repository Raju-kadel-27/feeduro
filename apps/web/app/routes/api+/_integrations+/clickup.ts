import {
  handleClickupAction,
  handleClickupLoader,
} from "@features/internal/integrations/clickup/server/service";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/clickup";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleClickupLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleClickupAction(db, request);
}
