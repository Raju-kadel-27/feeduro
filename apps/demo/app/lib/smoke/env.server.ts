import type { Env } from "../env.server";

export type Status = "pass" | "fail" | "warn" | "skip";
export interface Check { id: string; label: string; status: Status; detail: string; durationMs?: number }

const isSet = (v: string) => v.length > 0 && !v.startsWith("FILL_IN");

export function runEnvChecks(env: Env, apiUrl: string): Check[] {
  const checks: Check[] = [
    { id: "env-apikey", label: "API key",               status: isSet(env.FEEDURO_API_KEY) ? "pass" : "fail",       detail: isSet(env.FEEDURO_API_KEY) ? `${env.FEEDURO_API_KEY.slice(0, 12)}…` : "Not set — add to .dev.vars" },
    { id: "env-url",    label: "API URL",               status: "pass",                                             detail: apiUrl },
    { id: "env-wh",     label: "Webhook secret",        status: isSet(env.FEEDURO_WEBHOOK_SECRET) ? "pass" : "warn", detail: isSet(env.FEEDURO_WEBHOOK_SECRET) ? "Set" : "Not set — webhook tests skipped" },
    { id: "env-sign",   label: "Widget signing secret", status: isSet(env.FEEDURO_WIDGET_SIGNING_SECRET) ? "pass" : "warn", detail: isSet(env.FEEDURO_WIDGET_SIGNING_SECRET) ? "Set" : "Not set — HMAC tests skipped" },
  ];
  for (const c of checks) {
    const icon = c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "⚠";
    console.log(`[smoke] ${icon} ${c.label}: ${c.detail}`);
  }
  return checks;
}

export { isSet };
