import type { Env } from "../env.server";
import type { Board } from "./api-rest.server";
import type { Check } from "./env.server";
import { isSet } from "./env.server";

async function headCheck(url: string, label: string, id: string): Promise<Check> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: "HEAD" });
    const durationMs = Date.now() - t0;
    const pass = res.status >= 200 && res.status < 400;
    console.log(`[smoke] ${pass ? "✓" : "✗"} ${label}: HEAD ${url} → ${res.status}`);
    return { id, label, status: pass ? "pass" : "fail", durationMs, detail: `HEAD → ${res.status}` };
  } catch (e) {
    const durationMs = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[smoke] ✗ ${label}: ${msg}`);
    return { id, label, status: "fail", durationMs, detail: msg };
  }
}

export async function runConnectivityChecks(env: Env, apiUrl: string, boards: Board[]): Promise<Check[]> {
  const checks: Check[] = [];

  // Widget page reachability — HEAD /widget/:token
  const widgetCheck = await headCheck(`${apiUrl}/widget/${env.FEEDIYO_WIDGET_TOKEN}`, "Widget page reachable", "conn-widget");
  checks.push(widgetCheck);

  // Board embed token cross-reference — local env tokens vs. what the API returned
  const boardByToken = new Map(boards.map(b => [b.embedToken, b]));

  for (const [id, label, token] of [
    ["conn-board-feature",      "Board token: FEATURE",      env.FEEDIYO_WIDGET_TOKEN_FEATURE],
    ["conn-board-integrations", "Board token: INTEGRATIONS", env.FEEDIYO_WIDGET_TOKEN_INTEGRATIONS],
    ["conn-board-bugs",         "Board token: BUGS",         env.FEEDIYO_WIDGET_TOKEN_BUGS],
  ] as const) {
    if (!isSet(token)) {
      checks.push({ id, label, status: "skip", detail: "Token not set in .dev.vars" });
      continue;
    }
    const board = boardByToken.get(token);
    if (board) {
      console.log(`[smoke] ✓ ${label}: matches board "${board.name}"`);
      checks.push({ id, label, status: "pass", detail: `Matched board "${board.name}"` });
    } else {
      console.error(`[smoke] ✗ ${label}: token ${token.slice(0, 8)}… not found in API response`);
      checks.push({ id, label, status: "fail", detail: `Token ${token.slice(0, 8)}… not found in GET /v1/boards — may be stale or from wrong org` });
    }
  }

  // Board public URL reachability
  if (isSet(env.FEEDIYO_BOARD_PUBLIC_URL)) {
    const urlCheck = await headCheck(env.FEEDIYO_BOARD_PUBLIC_URL, "Board public URL", "conn-board-url");
    checks.push(urlCheck);
  } else {
    checks.push({ id: "conn-board-url", label: "Board public URL", status: "skip", detail: "FEEDIYO_BOARD_PUBLIC_URL not set" });
  }

  return checks;
}
