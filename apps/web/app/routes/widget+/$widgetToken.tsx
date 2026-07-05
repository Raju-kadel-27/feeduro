import { WidgetPage } from "@features/widget/components/public/widget-page";
import { getBoardWidgetData } from "@features/widget/server/board-queries";
import { getWidgetLoaderData } from "@features/widget/server/queries";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/$widgetToken";

export function headers() {
  return {
    "Content-Security-Policy": "frame-ancestors *",
  };
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") ?? "auto";

  // Board-level embed token takes priority; falls back to org widget config token
  const boardData = await getBoardWidgetData(params.widgetToken, theme);
  if (boardData) return boardData;

  return getWidgetLoaderData(db, params.widgetToken);
}

export default WidgetPage;
