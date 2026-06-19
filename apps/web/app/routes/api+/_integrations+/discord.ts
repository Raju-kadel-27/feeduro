import {
  handleDiscordAction,
  handleDiscordConnect,
} from "@features/internal/integrations/discord/server/oauth-handler";
import type { Route } from "./+types/discord";

export async function loader({ request }: Route.LoaderArgs) {
  return handleDiscordConnect(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleDiscordAction(request);
}
