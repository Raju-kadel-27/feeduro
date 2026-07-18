import { PageHeader } from "@components/common/page-header";
import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { requireAdmin, requireOrgBySlug } from "@features/auth/server/guards";
import { AuditLogPage } from "@features/internal/audit/components/audit-log-page";
import type { AuditCategory } from "@features/internal/audit/constants";
import { AUDIT_CATEGORIES } from "@features/internal/audit/constants";
import { listAuditLogs } from "@features/internal/audit/server/queries";
import { UpgradeWall } from "@features/internal/billing/components/upgrade-wall";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { ScrollText } from "lucide-react";
import { Suspense } from "react";
import { Await, useParams } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/audit-log";

type AuditData =
  | { planLocked: true }
  | (Awaited<ReturnType<typeof listAuditLogs>> & { page: number; category: AuditCategory | undefined });

export function meta() {
  return [{ title: "Audit Log — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  await requireAdmin(db, organizationId, session.user.id);

  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get("page"));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(Math.floor(rawPage), 10_000) : 1;
  const rawCategory = url.searchParams.get("category");
  const category: AuditCategory | undefined =
    rawCategory !== null && Object.hasOwn(AUDIT_CATEGORIES, rawCategory)
      ? (rawCategory as AuditCategory)
      : undefined;

  const dataPromise: Promise<AuditData> = Promise.all([
    getOrgPlanLimits(db, organizationId),
    listAuditLogs(db, organizationId, page, category),
  ]).then(([planLimits, auditData]) => {
    if (!planLimits.auditLog) return { planLocked: true as const };
    return { ...auditData, page, category };
  });
  return { dataPromise };
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="the audit log" />;
}

export default function AuditLogSettings({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await
          resolve={loaderData.dataPromise as unknown as Promise<AuditData>}
          errorElement={<RouteErrorMessage resource="the audit log" />}
        >
          {(pageData) => {
            if ("planLocked" in pageData) {
              return <UpgradeWall feature="auditLog" orgSlug={orgSlug!} />;
            }
            return (
              <main className="p-6 space-y-8">
                <div className="max-w-[840px] mx-auto w-full">
                  <PageHeader
                    title="Audit Log"
                    icon={ScrollText}
                    description="A record of security-relevant actions taken by members of this workspace."
                  />
                </div>
                <AuditLogPage
                  rows={pageData.rows}
                  total={pageData.total}
                  page={pageData.page}
                  pageCount={pageData.pageCount}
                  category={pageData.category}
                />
              </main>
            );
          }}
        </Await>
      </Suspense>
    </>
  );
}
