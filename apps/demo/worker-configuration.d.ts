// Regenerate with `pnpm cf:typegen` after adding secrets to wrangler
declare namespace Cloudflare {
  interface Env {
    FEEDURO_WIDGET_TOKEN: string;
    FEEDURO_API_KEY: string;
    FEEDURO_API_URL: string;
    FEEDURO_WEBHOOK_SECRET: string;
    FEEDURO_WIDGET_SIGNING_SECRET: string;
    FEEDURO_BOARD_PUBLIC_URL: string;
    FEEDURO_STAGING_API_URL: string;
    FEEDURO_PROD_API_URL: string;
    FEEDURO_OAUTH_CLIENT_ID: string;
    FEEDURO_OAUTH_CLIENT_SECRET: string;
    FEEDURO_OAUTH_REDIRECT_URI: string;
  }
}
interface Env extends Cloudflare.Env {}
