import {
  handleGithubAction,
  handleGithubLoader,
} from "@features/internal/integrations/github/server/service";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/github";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleGithubLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleGithubAction(db, request);
}
