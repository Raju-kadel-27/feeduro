import { PublicBoardPage } from "@features/feedback/components/public/public-board-page";
import { publicPageLoader } from "@features/feedback/server/public-loader";
import type { Route } from "./+types/_index";

export const loader = publicPageLoader;

export default function PublicBoardIndex({ loaderData }: Route.ComponentProps) {
  return <PublicBoardPage loaderData={loaderData} />;
}
