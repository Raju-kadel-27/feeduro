import { getAuth } from "@lib/auth/server";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/[.]well-known.$";

export async function loader({ request, context }: Route.LoaderArgs) {
  return getAuth(getDb(context)).handler(request);
}
