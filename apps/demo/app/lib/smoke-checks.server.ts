import type { RouterContextProvider } from "react-router";
import { createApiClient } from "./api-client.server";
import { getActiveApiUrl } from "./env-override.server";
import { getEnv } from "./env.server";
import { runApiRestChecks } from "./smoke/api-rest.server";
import { runConnectivityChecks } from "./smoke/connectivity.server";
import { runEnvChecks } from "./smoke/env.server";
import { runWebhookChecks } from "./smoke/webhooks.server";

export type { Check, Status } from "./smoke/env.server";

export async function runChecks(request: Request, context: Readonly<RouterContextProvider>) {
  const env = getEnv(context);
  const apiUrl = getActiveApiUrl(request, env);
  const api = createApiClient(apiUrl, env.FEEDIYO_API_KEY);

  console.log(`[smoke] running checks against ${apiUrl}`);

  const envChecks = runEnvChecks(env, apiUrl);

  const [restResult, webhookChecks] = await Promise.all([
    runApiRestChecks(api, apiUrl),
    runWebhookChecks(env.FEEDIYO_WEBHOOK_SECRET, request),
  ]);

  const connectivityChecks = await runConnectivityChecks(env, apiUrl, restResult.boards);

  const all = [...envChecks, ...restResult.checks, ...webhookChecks, ...connectivityChecks];
  const failed = all.filter(c => c.status === "fail");

  if (failed.length > 0) {
    console.error(`[smoke] ${failed.length} check(s) FAILED: ${failed.map(c => `${c.label}: ${c.detail}`).join(" | ")}`);
  } else {
    const passed = all.filter(c => c.status === "pass").length;
    const skipped = all.filter(c => c.status === "skip").length;
    console.log(`[smoke] all clear — ${passed} passed, ${skipped} skipped`);
  }

  return all;
}
