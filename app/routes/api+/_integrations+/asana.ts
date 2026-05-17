import {
  handleAsanaAction,
  handleAsanaLoader,
} from "@features/integrations/asana/server/service";

import type { Route } from "./+types/asana";

export async function loader({ request }: Route.LoaderArgs) {
  return handleAsanaLoader(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleAsanaAction(request);
}
