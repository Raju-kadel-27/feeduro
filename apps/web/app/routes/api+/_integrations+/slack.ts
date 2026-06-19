import {
  handleSlackAction,
  handleSlackConnect,
} from "@features/internal/integrations/slack/server/oauth-handler";
import type { Route } from "./+types/slack";

export async function loader({ request }: Route.LoaderArgs) {
  return handleSlackConnect(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleSlackAction(request);
}
