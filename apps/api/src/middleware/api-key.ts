import { apiError } from "@feeduro/errors";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apikey } from "@/db/schema";
import { getDb } from "../db";
import type { Env } from "../env";

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const apiKeyMiddleware = createMiddleware<Env>(async (c, next) => {
  const token = c.req.header("x-api-key");
  if (!token) {
    const { body, init } = apiError("missing_api_key");
    return c.json(body, init.status as 401);
  }

  const hash = await sha256hex(token);
  const db = getDb(c);
  const now = new Date();

  const row = await db.query.apikey.findFirst({
    where: and(
      eq(apikey.key, hash),
      eq(apikey.enabled, true),
      or(isNull(apikey.expiresAt), gt(apikey.expiresAt, now)),
    ),
    columns: { referenceId: true },
  });

  if (!row) {
    const { body, init } = apiError("invalid_api_key");
    return c.json(body, init.status as 401);
  }

  c.set("organizationId", row.referenceId);
  await next();
});
