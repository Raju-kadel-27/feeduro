import { apiError } from "@feediyo/errors";
import { data } from "react-router";
import { auth } from "@/app/lib/auth/server";

export async function requireApiKey(request: Request): Promise<string> {
  const token = request.headers.get("x-api-key");
  if (!token) {
    const err = apiError("missing_api_key");
    throw data(err.body, err.init);
  }

  const result = await auth.api.verifyApiKey({
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
