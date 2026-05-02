import { redirect } from "react-router";
import type { Route } from "./+types/_index";

export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.orgSlug}/settings/workspace`);
}
