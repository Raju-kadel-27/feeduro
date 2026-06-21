import type { getEnv } from "@utils/get-env";

type Env = ReturnType<typeof getEnv>;

export function resolveDodoPlan(e: Env, productId: string): string {
  if (
    productId === e.DODO_STARTER_MONTHLY_PRODUCT_ID ||
    productId === e.DODO_STARTER_ANNUAL_PRODUCT_ID
  )
    return "starter";
  if (productId === e.DODO_PRO_MONTHLY_PRODUCT_ID || productId === e.DODO_PRO_ANNUAL_PRODUCT_ID)
    return "professional";
  throw new Error(`Unknown Dodo product ID: ${productId}`);
}

export function resolveDodoInterval(e: Env, productId: string): string {
  if (productId === e.DODO_STARTER_ANNUAL_PRODUCT_ID || productId === e.DODO_PRO_ANNUAL_PRODUCT_ID)
    return "annual";
  return "monthly";
}
