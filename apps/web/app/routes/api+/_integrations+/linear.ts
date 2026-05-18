import {
  handleLinearAction,
  handleLinearLoader,
} from "@features/integrations/linear/server/service";

import type { Route } from "./+types/linear";

export async function loader({ request }: Route.LoaderArgs) {
  return handleLinearLoader(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleLinearAction(request);
}
