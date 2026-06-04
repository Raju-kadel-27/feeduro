import { SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { SettingsActionSchema } from "@features/widget/schemas/settings";
import {
  regenerateWidgetToken,
  revealWidgetSecret,
  rotateWidgetSecret,
  saveWidgetAllowedOrigins,
  saveWidgetSettings,
  toggleWidgetEnabled,
} from "@features/widget/server/settings-actions";
import { getWidgetSettings } from "@features/widget/server/settings-queries";
import { WidgetSettingsPage } from "@features/widget/components/widget-settings-page";
import { data } from "react-router";
import type { Route } from "./+types/widget";

export function meta() {
  return [{ title: "Widget Settings — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { org } = await requireOrgBySlug(request, params.orgSlug);
  const { config, boards } = await getWidgetSettings(org.id);
  return data({ orgSlug: org.slug ?? "", config, boards });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { org } = await requireOrgBySlug(request, params.orgSlug);
  const form = await request.formData();
  const parsed = SettingsActionSchema.safeParse(Object.fromEntries(form));

  if (!parsed.success) {
    return data({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const { data: input } = parsed;

  switch (input.intent) {
    case "save":
      return data(await saveWidgetSettings(org.id, input));
    case "toggle-enabled":
      return data(await toggleWidgetEnabled(org.id, input));
    case "regenerate":
      return data(await regenerateWidgetToken(org.id));
    case "rotate-secret":
      return data(await rotateWidgetSecret(org.id));
    case "reveal-secret":
      return data(await revealWidgetSecret(org.id));
    case "save-origins":
      return data(await saveWidgetAllowedOrigins(org.id, input.allowedOrigins));
  }
}

export function ErrorBoundary() {
  return (
    <div className="p-6">
      <p className="text-sm text-destructive">
        Failed to load widget settings. Please refresh the page.
      </p>
    </div>
  );
}

export default function WidgetSettings({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <span className="text-sm font-medium text-foreground">Widget</span>
      </header>
      <WidgetSettingsPage loaderData={loaderData} />
    </>
  );
}
