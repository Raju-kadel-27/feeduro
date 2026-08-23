import {
  handleDiscordAction,
  handleDiscordLoader,
} from "@features/internal/integrations/discord/server/oauth-handler";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/discord";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleDiscordLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleDiscordAction(db, request);
}
