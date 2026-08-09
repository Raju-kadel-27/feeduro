import { AdminOnlyWall } from "@components/common/admin-only-wall";
import { PageHeader } from "@components/common/page-header";
import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AuditLogPage } from "@features/internal/audit/components/audit-log-page";
import type { AuditCategory } from "@features/internal/audit/constants";
import { AUDIT_CATEGORIES } from "@features/internal/audit/constants";
import { listAuditLogs } from "@features/internal/audit/server/queries";
import { UpgradeWall } from "@features/internal/billing/components/upgrade-wall";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { and, eq } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { Suspense } from "react";
import { Await, useParams } from "react-router";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/audit-log";

type AuditData =
  | { planLocked: true }
  | { adminLocked: true }
  | (Awaited<ReturnType<typeof listAuditLogs>> & { page: number; category: AuditCategory | undefined });

export function meta() {
  return [{ title: "Audit Log — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

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
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
  ]).then(([planLimits, memberRecord]) => {
    if (!planLimits.auditLog) return { planLocked: true as const };
    if (memberRecord?.role !== "admin") return { adminLocked: true as const };
    return listAuditLogs(db, organizationId, page, category).then((auditData) => ({
      ...auditData,
      page,
      category,
    }));
  });
  return { dataPromise };
}

export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.search !== nextUrl.search;
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="the audit log" />;
}

export default function AuditLogSettings({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
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
            if ("adminLocked" in pageData) {
              return (
                <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
                  <PageHeader
                    title="Audit Log"
                    icon={ScrollText}
                    description="A record of security-relevant actions taken by members of this workspace."
                  />
                  <AdminOnlyWall message="Only workspace admins can view the audit log." />
                </main>
              );
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
