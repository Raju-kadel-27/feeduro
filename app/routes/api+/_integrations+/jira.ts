import { handleJiraAction, handleJiraLoader } from "@features/integrations/jira/server/service";

import type { Route } from "./+types/jira";

export async function loader({ request }: Route.LoaderArgs) {
  return handleJiraLoader(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleJiraAction(request);
}
