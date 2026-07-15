import { APP_DOMAIN, RESERVED_SUBDOMAINS } from "../constants";

// Non-page routes that must resolve as-is on org subdomains: auth + OG images
// (/api), the public API (/v1), widget embeds (/widget), and OIDC discovery
// (/.well-known). Prefixing these with the org slug would 404 them.
const PASSTHROUGH_PREFIXES = ["/api/", "/v1/", "/widget/", "/.well-known/"];

/**
 * Maps `{orgSlug}.feeduro.com/*` to the path-based `/{orgSlug}/*` route so
 * React Router serves the org's public board. Returns null when the request
 * is not for an org subdomain (apex domain, reserved subdomain, nested
 * subdomain, or a foreign host such as localhost or a custom domain) or
 * targets an infrastructure path that must not be rewritten.
 */
export function rewriteSubdomainRequest(request: Request): Request | null {
  const url = new URL(request.url);

  if (!url.hostname.endsWith(`.${APP_DOMAIN}`)) return null;

  const orgSlug = url.hostname.slice(0, -(APP_DOMAIN.length + 1));
  if (!orgSlug || orgSlug.includes(".") || RESERVED_SUBDOMAINS.has(orgSlug)) {
    return null;
  }

  if (PASSTHROUGH_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    return null;
  }

  const rewritten = new URL(`/${orgSlug}${url.pathname}`, url);
  rewritten.search = url.search;
  return new Request(rewritten.toString(), request);
}
