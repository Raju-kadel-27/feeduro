import { getAuth } from "@lib/auth/server";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/api.auth.$";

export async function loader({ request, context }: Route.LoaderArgs) {
  return getAuth(getDb(context)).handler(request);
}

export async function action({ request, context }: Route.ActionArgs) {
  return getAuth(getDb(context)).handler(request);
}
