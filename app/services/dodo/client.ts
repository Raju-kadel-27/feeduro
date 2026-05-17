import { getEnv } from "@utils/get-env";
import DodoPayments from "dodopayments";

export function getDodoClient(): DodoPayments {
  const env = getEnv();
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY!,
    environment: env.ENVIRONMENT === "production" ? "live_mode" : "test_mode",
  });
}
