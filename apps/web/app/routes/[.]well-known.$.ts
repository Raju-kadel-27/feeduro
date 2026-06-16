import { auth } from "@lib/auth/server";
import type { Route } from "./+types/[.]well-known.$";

export async function loader({ request }: Route.LoaderArgs) {
  return auth.handler(request);
}
