import { WidgetPage } from "@features/widget/components/public/widget-page";
import { getBoardWidgetData } from "@features/widget/server/board-queries";
import { getWidgetLoaderData } from "@features/widget/server/queries";

import type { Route } from "./+types/$widgetToken";

export function headers() {
  return {
    "Content-Security-Policy": "frame-ancestors *",
  };
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") ?? "auto";

  // Board-level embed token takes priority; falls back to org widget config token
  const boardData = await getBoardWidgetData(params.widgetToken, theme);
  if (boardData) return boardData;

  return getWidgetLoaderData(params.widgetToken);
}

export default WidgetPage;
