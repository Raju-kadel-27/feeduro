import {
  handleMondayAction,
  handleMondayLoader,
} from "@features/internal/integrations/monday/server/service";

import type { Route } from "./+types/monday";

export async function loader({ request }: Route.LoaderArgs) {
  return handleMondayLoader(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleMondayAction(request);
}
