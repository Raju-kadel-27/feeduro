import { handleShortcutAction } from "@features/internal/integrations/shortcut/server/service";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/shortcut";

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleShortcutAction(db, request);
}
