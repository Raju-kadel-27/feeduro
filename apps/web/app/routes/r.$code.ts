import { isBot } from "@features/internal/affiliate/server/bot-detection";
import { recordClick } from "@features/internal/affiliate/server/service";
import { getEnv } from "@utils/get-env";
import { redirect } from "react-router";

import type { Route } from "./+types/r.$code";

// Handles /r/:code — records the click, sets the attribution cookie, then
// redirects the visitor to the home page (or wherever you want to land them).
export async function loader({ request, params }: Route.LoaderArgs) {
  const code = (params.code ?? "").toUpperCase();

  // Bots inflate click counts and pollute attribution data — drop silently.
  if (isBot(request)) {
    return redirect("/");
  }

  // Per-click deduplication: if this browser already triggered a click for
  // this code in the last hour, skip the DB write (mirrors Dub's 1-hour window).
  const dedupCookie = `aff_clk_${code}`;
  const alreadyClicked = request.headers
    .get("cookie")
    ?.split(";")
    .some((c) => c.trim().startsWith(`${dedupCookie}=`));

  if (!alreadyClicked) {
    await recordClick(code, request);
  }

  const isProduction = getEnv().ENVIRONMENT === "production";
  const secureFlag = isProduction ? "; Secure" : "";
  const dest = new URL(request.url).searchParams.get("to") ?? "/";
  const response = redirect(dest);

  // Set both cookies regardless of whether the code was found, so bots that
  // slip past detection don't get a second chance within the hour window.
  // aff_ref  = 30-day attribution window, HttpOnly (JS can't read or tamper)
  // aff_clk_ = 1-hour dedup window, HttpOnly
  response.headers.append(
    "Set-Cookie",
    `aff_ref=${code}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax${secureFlag}`,
  );
  response.headers.append(
    "Set-Cookie",
    `${dedupCookie}=1; Path=/; Max-Age=${60 * 60}; HttpOnly; SameSite=Lax${secureFlag}`,
  );

  return response;
}
