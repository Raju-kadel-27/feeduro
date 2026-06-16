import { PageHeader } from "@components/common/page-header";
import { Switch } from "@components/ui/switch";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { SubscriptionsSection } from "@features/changelog/components/settings/subscriptions-section";
import { TagsSection } from "@features/changelog/components/settings/tags-section";
import { parseChangelogSettings } from "@features/changelog/server/changelog-settings";
import { getSubscriberCount } from "@features/changelog/server/subscribers";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { getDb } from "@/db";
import { changelogTags, organization } from "@/db/schema";
import type { Route } from "./+types/changelog";

export function meta() {
  return [{ title: "Changelog Settings — Feeduro" }];
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
        <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <PageHeader title="Changelog" />

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
        </>
  );
}
