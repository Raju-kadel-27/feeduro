import { dodoClient } from "@lib/auth/server/dodo-client";
import type DodoPayments from "dodopayments";

export function getDodoClient(): DodoPayments {
  if (!dodoClient) throw new Error("Dodo Payments client is not initialised — check DODO_PAYMENTS_API_KEY");
  return dodoClient;
}
