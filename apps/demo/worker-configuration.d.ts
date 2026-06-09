// Regenerate with `pnpm cf:typegen` after adding secrets to wrangler
declare namespace Cloudflare {
  interface Env {
    FEEDIYO_WIDGET_TOKEN: string;
    FEEDIYO_API_KEY: string;
    FEEDIYO_API_URL: string;
    FEEDIYO_WEBHOOK_SECRET: string;
    FEEDIYO_WIDGET_SIGNING_SECRET: string;
    FEEDIYO_BOARD_PUBLIC_URL: string;
    FEEDIYO_STAGING_API_URL: string;
    FEEDIYO_PROD_API_URL: string;
  }
}
interface Env extends Cloudflare.Env {}
