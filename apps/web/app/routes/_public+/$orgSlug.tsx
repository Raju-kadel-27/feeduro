import { PublicBoardPage } from "@features/feedback/components/public/public-board-page";
import { buildPublicBoardMeta } from "@features/feedback/public-board-meta";
import { publicPageLoader } from "@features/feedback/server/public-loader";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/$orgSlug";

export function loader({ request, params, context }: Route.LoaderArgs) {
  return publicPageLoader(getDb(context), { request, orgSlug: params.orgSlug });
}

export function meta({ data, location }: Route.MetaArgs) {
  return buildPublicBoardMeta(data, location.search);
}

export default function PublicBoardRoute({ loaderData }: Route.ComponentProps) {
  return <PublicBoardPage loaderData={loaderData} />;
}
