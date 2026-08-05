import { TwoFactorSettingsPanel } from "@features/auth/components/two-factor/settings-panel";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/two-factor";

export function meta() {
  return [{ title: "Two-Factor Authentication — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  await requireOrgBySlug(db, request, params.orgSlug);
  return null;
}

export default function TwoFactorSettings() {
  return <TwoFactorSettingsPanel />;
}
