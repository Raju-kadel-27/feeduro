import { data } from "react-router";
import { setEnvCookie, type ActiveEnv } from "@lib/env-override.server";
import type { Route } from "./+types/set-env";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const env = String(form.get("env") ?? "local") as ActiveEnv;
  const valid: ActiveEnv[] = ["local", "staging", "prod"];
  const safe: ActiveEnv = valid.includes(env) ? env : "local";
  return data({ ok: true }, { headers: { "Set-Cookie": setEnvCookie(safe) } });
}
