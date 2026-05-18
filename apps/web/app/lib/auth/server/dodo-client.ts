import { getEnv } from "@utils/get-env";
import DodoPayments from "dodopayments";

export type DodoSub = {
  subscription_id: string;
  product_id: string;
  status: string;
  cancel_at_next_billing_date?: boolean;
  next_billing_date?: string | Date;
  metadata: Record<string, string>;
  customer?: { customer_id: string };
};

const env = getEnv();

export const dodoClient = env.DODO_PAYMENTS_API_KEY
  ? new DodoPayments({
      bearerToken: env.DODO_PAYMENTS_API_KEY,
      environment: env.ENVIRONMENT === "production" ? "live_mode" : "test_mode",
    })
  : null;
