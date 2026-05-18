import { TwoFactorSettingsPanel } from "@features/auth/components/two-factor/settings-panel";
import { requireOrgBySlug } from "@features/auth/server/guards";

import type { Route } from "./+types/two-factor";

export function meta() {
  return [{ title: "Two-Factor Authentication — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOrgBySlug(request, params.orgSlug);
  return null;
}

export default function TwoFactorSettings() {
  return <TwoFactorSettingsPanel />;
}
