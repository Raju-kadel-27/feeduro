import { useSearchParams } from "react-router";
import type { AuditLogRow } from "../server/queries";
import { AuditLogTable } from "./audit-log-table";

type Props = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageCount: number;
};

export function AuditLogPage({ rows, total, page, pageCount }: Props) {
  const [, setSearchParams] = useSearchParams();

  function handlePageChange(newPage: number) {
    setSearchParams((prev) => {
      prev.set("page", String(newPage));
      return prev;
    });
  }

  return (
    <main className="px-8 py-6 w-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          A record of security-relevant actions taken by members of this workspace.
        </p>
      </div>
      <AuditLogTable
        rows={rows}
        total={total}
        page={page}
        pageCount={pageCount}
        onPageChange={handlePageChange}
      />
    </main>
  );
}
