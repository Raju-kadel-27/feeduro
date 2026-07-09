import { APP_DOMAIN } from "./constants";

export function getPublicBoardUrl(orgSlug: string) {
  return `https://${orgSlug}.${APP_DOMAIN}`;
}
