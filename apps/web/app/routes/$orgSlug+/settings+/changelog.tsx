import { PageHeader } from "@components/common/page-header";
import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { Switch } from "@components/ui/switch";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { SubscriptionsSection } from "@features/changelog/components/settings/subscriptions-section";
import { TagsSection } from "@features/changelog/components/settings/tags-section";
import { parseChangelogSettings } from "@features/changelog/server/changelog-settings";
import { getSubscriberCount } from "@features/changelog/server/subscribers";
import { eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { Suspense, useState } from "react";
import { Await, useLoaderData } from "react-router";
import { toast } from "sonner";
import { changelogTags, organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/changelog";

type ChangelogData = ReturnType<typeof parseChangelogSettings> & {
  tags: { id: string; name: string; color: string }[];
  subscriberCount: number;
};

export function meta() {
  return [{ title: "Changelog Settings | Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const dataPromise = Promise.all([
    db.query.organization.findFirst({ where: eq(organization.id, organizationId), columns: { metadata: true } }),
    db.query.changelogTags.findMany({
      where: eq(changelogTags.organizationId, organizationId),
      columns: { id: true, name: true },
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    }),
    getSubscriberCount(db, organizationId),
  ]).then(([org, tags, subscriberCount]) => ({
    ...parseChangelogSettings(org?.metadata ?? null),
    tags: tags.map((t) => ({ ...t, color: "" })),
    subscriberCount,
  }));

  return { dataPromise };
}

export function shouldRevalidate() {
  return false;
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="changelog settings" />;
}

export default function ChangelogSettings() {
  const { dataPromise } = useLoaderData() as { dataPromise: Promise<ChangelogData> };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await
          resolve={dataPromise}
          errorElement={<RouteErrorMessage resource="changelog settings" />}
        >
          {(pageData) => <ChangelogContent data={pageData} />}
        </Await>
      </Suspense>
    </>
  );
}

function ChangelogContent({ data: loaderData }: { data: ChangelogData }) {
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
    <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
      <PageHeader title="Changelog" icon={FileText} />

          <div className="rounded-lg border divide-y">
            <div className="flex items-start justify-between gap-6 p-5">
              <div>
                <p className="text-base font-semibold">Enable Changelog</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  When disabled, your changelog is hidden from the public board.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={handleToggle} />
            </div>
            <div className="p-5">
              <SubscriptionsSection
                initialEnabled={loaderData.emailSubscriptionsEnabled}
                subscriberCount={loaderData.subscriberCount}
              />
            </div>
          </div>

      <TagsSection initialTags={loaderData.tags} />
    </main>
  );
}
