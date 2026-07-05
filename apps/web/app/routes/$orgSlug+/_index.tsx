import { PublicBoardPage } from "@features/feedback/components/public/public-board-page";
import { publicPageLoader } from "@features/feedback/server/public-loader";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/_index";

export function loader({ request, params, context }: Route.LoaderArgs) {
  return publicPageLoader(getDb(context), { request, params });
}

export default function PublicBoardIndex({ loaderData }: Route.ComponentProps) {
  return <PublicBoardPage loaderData={loaderData} />;
}
