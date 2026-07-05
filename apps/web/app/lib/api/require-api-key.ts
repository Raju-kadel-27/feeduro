import { apiError } from "@feeduro/errors";
import { getAuth } from "@lib/auth/server";
import { data } from "react-router";
import type { Db } from "@/db";

export async function requireApiKey(db: Db, request: Request): Promise<string> {
  const token = request.headers.get("x-api-key");
  if (!token) {
    const err = apiError("missing_api_key");
    throw data(err.body, err.init);
  }

  const result = await getAuth(db).api.verifyApiKey({
    body: { key: token },
    headers: request.headers,
  });

  if (!result.valid || !result.key) {
    const code = result.error?.code;
    if (code === "RATE_LIMITED") {
      const err = apiError("rate_limit_exceeded");
      throw data(err.body, err.init);
    }
    const err = apiError("invalid_api_key");
    throw data(err.body, err.init);
  }

  return result.key.referenceId;
}
