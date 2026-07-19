import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // RR v8 added a CSRF origin check (throwIfPotentialCSRFAttack). In dev the
  // @cloudflare/vite-plugin Miniflare runner proxies requests through an
  // internal socket so request.url host != Origin header host → "Bad Request".
  // localhost:3000 is the Vite dev server port (see vite.config.ts).
  allowedActionOrigins: ["localhost:3000"],
} satisfies Config;
