import { PageTitle } from "@components/common/page-title";
import { requireAdmin, requireOrgBySlug } from "@features/auth/server/guards";
import { AuditLogPage } from "@features/internal/audit/components/audit-log-page";
import { listAuditLogs } from "@features/internal/audit/server/queries";
import { data } from "react-router";
import type { Route } from "./+types/audit-log";

export function meta() {
  return [{ title: "Audit Log — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  await requireAdmin(organizationId, session.user.id);

  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get("page"));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(Math.floor(rawPage), 10_000) : 1;

  const { rows, total, pageCount } = await listAuditLogs(organizationId, page);
  return data({ rows, total, page, pageCount });
}

export function ErrorBoundary() {
  return (
    <div className="p-6">
      <p className="text-sm text-destructive">Failed to load audit log. Please refresh.</p>
    </div>
  );
}

export default function AuditLogSettings({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <PageTitle title="Audit Log" />
      <AuditLogPage
        rows={loaderData.rows}
        total={loaderData.total}
        page={loaderData.page}
        pageCount={loaderData.pageCount}
      />
    </>
  );
}
