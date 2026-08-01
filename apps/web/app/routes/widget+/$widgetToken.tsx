import { WidgetPage } from "@features/widget/components/public/widget-page";
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
  const boardSlug = url.searchParams.get("board") ?? undefined;

  return getWidgetLoaderData(db, params.widgetToken, boardSlug, theme);
}

export default WidgetPage;
