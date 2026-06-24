import type { Row } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ShieldOff } from "lucide-react";
import { Fragment } from "react";
import { AUDIT_PAGE_SIZE } from "../constants";
import type { AuditLogRow } from "../server/queries";
import { auditLogColumns } from "./audit-log-columns";

type Props = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

function getDateLabel(val: Date | string): string {
  const date = val instanceof Date ? val : new Date(val);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const rowStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (rowStart.getTime() === todayStart.getTime()) return "Today";
  if (rowStart.getTime() === yesterdayStart.getTime()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function groupRowsByDate(rows: Row<AuditLogRow>[]): Array<{ label: string; rows: Row<AuditLogRow>[] }> {
  const groups: Array<{ label: string; rows: Row<AuditLogRow>[] }> = [];
  let current: { label: string; rows: Row<AuditLogRow>[] } | null = null;

  for (const row of rows) {
    const label = getDateLabel(row.original.createdAt);
    if (!current || current.label !== label) {
      current = { label, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }

  return groups;
}

export function AuditLogTable({ rows, total, page, pageCount, onPageChange }: Props) {
  const table = useReactTable({
    data: rows,
    columns: auditLogColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination: { pageIndex: page - 1, pageSize: AUDIT_PAGE_SIZE } },
  });

  const allRows = table.getRowModel().rows;
  const isEmpty = allRows.length === 0;
  const groups = isEmpty ? [] : groupRowsByDate(allRows);

  return (
    <div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {isEmpty ? (
              <tr>
                <td colSpan={auditLogColumns.length} className="px-5 py-16 text-center">
                  <ShieldOff className="h-12 w-12 mx-auto text-teal-500 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No audit events yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Security-relevant actions will appear here.
                  </p>
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <Fragment key={group.label}>
                  <tr className="bg-muted/30">
                    <td
                      colSpan={auditLogColumns.length}
                      className="px-5 py-2 text-xs font-semibold text-muted-foreground tracking-wide"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          {total} event{total !== 1 ? "s" : ""} total
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= pageCount}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
