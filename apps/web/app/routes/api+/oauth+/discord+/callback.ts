import { handleDiscordCallback } from "@features/internal/integrations/discord/server/oauth-handler";
import type { Route } from "./+types/callback";

export async function loader({ request }: Route.LoaderArgs) {
  return handleDiscordCallback(request);
}
