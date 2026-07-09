import { APP_DOMAIN, RESERVED_SUBDOMAINS } from "../constants";

/**
 * Maps `{orgSlug}.feeduro.com/*` to the path-based `/{orgSlug}/*` route so
 * React Router serves the org's public board. Returns null when the request
 * is not for an org subdomain (apex domain, reserved subdomain, nested
 * subdomain, or a foreign host such as localhost or a custom domain).
 */
export function rewriteSubdomainRequest(request: Request): Request | null {
  const url = new URL(request.url);

  if (!url.hostname.endsWith(`.${APP_DOMAIN}`)) return null;

  const orgSlug = url.hostname.slice(0, -(APP_DOMAIN.length + 1));
  if (!orgSlug || orgSlug.includes(".") || RESERVED_SUBDOMAINS.has(orgSlug)) {
    return null;
  }

  const rewritten = new URL(`/${orgSlug}${url.pathname}`, url);
  rewritten.search = url.search;
  return new Request(rewritten.toString(), request);
}
