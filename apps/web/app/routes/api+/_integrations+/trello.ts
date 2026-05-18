import {
  handleTrelloAction,
  handleTrelloLoader,
} from "@features/integrations/trello/server/service";

import type { Route } from "./+types/trello";

export async function loader({ request }: Route.LoaderArgs) {
  return handleTrelloLoader(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleTrelloAction(request);
}
