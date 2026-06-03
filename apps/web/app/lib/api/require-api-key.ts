import { apiError } from "@feediyo/errors";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { apikey } from "@/db/schema";

export async function requireApiKey(request: Request): Promise<string> {
  const token = request.headers.get("x-api-key");
  if (!token) {
    const err = apiError("missing_api_key");
    throw data(err.body, err.init);
  }
  const db = getDb();

  const key = await db.query.apikey.findFirst({
    where: and(eq(apikey.key, token), eq(apikey.enabled, true)),
    columns: { referenceId: true, expiresAt: true },
  });

  if (!key || (key.expiresAt && key.expiresAt <= new Date())) {
    const err = apiError("invalid_api_key");
    throw data(err.body, err.init);
  }

  return key.referenceId;
}
