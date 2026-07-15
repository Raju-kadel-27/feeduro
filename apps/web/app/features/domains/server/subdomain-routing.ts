import { APP_DOMAIN, RESERVED_SUBDOMAINS } from "../constants";

/**
 * Extracts the org slug from a `{orgSlug}.feeduro.com` host. Returns null when
 * the host is not an org subdomain (apex domain, reserved subdomain, nested
 * subdomain, or a foreign host such as localhost or a custom domain).
 *
 * Subdomain routing must stay host-aware rather than rewriting the URL: the
 * client router hydrates from the browser URL, so a server-only rewrite of
 * `/` to `/{orgSlug}` makes the server and client match different routes and
 * breaks hydration. Routes that serve subdomain traffic branch on this value.
 */
export function getOrgSubdomain(hostname: string): string | null {
  if (!hostname.endsWith(`.${APP_DOMAIN}`)) return null;

  const orgSlug = hostname.slice(0, -(APP_DOMAIN.length + 1));
  if (!orgSlug || orgSlug.includes(".") || RESERVED_SUBDOMAINS.has(orgSlug)) {
    return null;
  }

  return orgSlug;
}
