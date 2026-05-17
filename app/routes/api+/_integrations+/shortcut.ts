import { handleShortcutAction } from "@features/integrations/shortcut/server/service";

import type { Route } from "./+types/shortcut";

export async function action({ request }: Route.ActionArgs) {
  return handleShortcutAction(request);
}
