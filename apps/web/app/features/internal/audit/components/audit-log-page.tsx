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
    <AuditLogTable
      rows={rows}
      total={total}
      page={page}
      pageCount={pageCount}
      onPageChange={handlePageChange}
    />
  );
}
