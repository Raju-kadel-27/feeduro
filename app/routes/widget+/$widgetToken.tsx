import { WidgetPage } from "@features/widget/components/widget-page";
import { getWidgetLoaderData } from "@features/widget/server/queries";

import type { Route } from "./+types/$widgetToken";

export function headers() {
  return {
    "Content-Security-Policy": "frame-ancestors *",
  };
}

export async function loader({ params }: Route.LoaderArgs) {
  return getWidgetLoaderData(params.widgetToken);
}

export default WidgetPage;
