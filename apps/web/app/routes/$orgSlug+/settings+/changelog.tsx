import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Switch } from "@components/ui/switch";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { parseChangelogSettings } from "@features/changelog/server/changelog-settings";
import { getSubscriberCount } from "@features/changelog/server/subscribers";
import { SubscriptionsSection } from "@features/changelog/components/settings/subscriptions-section";
import { TagsSection } from "@features/changelog/components/settings/tags-section";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { toast } from "sonner";
import { getDb } from "@/db";
import { changelogTags, organization } from "@/db/schema";
import type { Route } from "./+types/changelog";

export function meta() {
  return [{ title: "Changelog Settings — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [org, tags, subscriberCount] = await Promise.all([
    db.query.organization.findFirst({ where: eq(organization.id, organizationId) }),
    db.query.changelogTags.findMany({
      where: eq(changelogTags.organizationId, organizationId),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    }),
    getSubscriberCount(organizationId),
  ]);

  return { ...parseChangelogSettings(org?.metadata ?? null), tags, subscriberCount };
}

export default function ChangelogSettings({ loaderData }: Route.ComponentProps) {
  const [enabled, setEnabled] = useState(loaderData.enabled);

  async function handleToggle(value: boolean) {
    const prev = enabled;
    setEnabled(value);
    try {
      const res = await fetch("/api/changelog-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "toggle", enabled: value }),
      });
      if (!res.ok) throw new Error();
      toast.success(value ? "Changelog enabled" : "Changelog hidden");
    } catch {
      setEnabled(prev);
      toast.error("Failed to save");
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Changelog</span>
        </header>

        <main className="p-6 max-w-3xl mx-auto w-full space-y-8">
          <div>
            <h1 className="text-xl font-semibold">Changelog</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage changelog visibility, subscriptions, and tags.
            </p>
          </div>

          <div className="rounded-lg border p-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium">Enable Changelog</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When disabled, your changelog is hidden from the public board.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={handleToggle} />
            </div>
          </div>

          <SubscriptionsSection
            initialEnabled={loaderData.emailSubscriptionsEnabled}
            subscriberCount={loaderData.subscriberCount}
          />

          <TagsSection initialTags={loaderData.tags} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
