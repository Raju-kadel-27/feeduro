import {
  handleGithubAction,
  handleGithubLoader,
} from "@features/integrations/github/server/service";

import type { Route } from "./+types/github";

export async function loader({ request }: Route.LoaderArgs) {
  return handleGithubLoader(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleGithubAction(request);
}
