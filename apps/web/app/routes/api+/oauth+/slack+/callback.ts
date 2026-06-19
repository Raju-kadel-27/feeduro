import { handleSlackCallback } from "@features/internal/integrations/slack/server/oauth-handler";
import type { Route } from "./+types/callback";

export async function loader({ request }: Route.LoaderArgs) {
  return handleSlackCallback(request);
}
