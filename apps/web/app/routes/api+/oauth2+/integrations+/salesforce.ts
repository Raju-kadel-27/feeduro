import { handleSalesforceAction, handleSalesforceLoader } from "@features/internal/integrations/salesforce/server/service";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/salesforce";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  return handleSalesforceLoader(db, request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  return handleSalesforceAction(db, request);
}
