import {
  handleClickupAction,
  handleClickupLoader,
} from "@features/integrations/clickup/server/service";

import type { Route } from "./+types/clickup";

export async function loader({ request }: Route.LoaderArgs) {
  return handleClickupLoader(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleClickupAction(request);
}
