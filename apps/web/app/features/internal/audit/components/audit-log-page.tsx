import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { AuditCategory } from "../constants";
import { AUDIT_CATEGORY_LABELS } from "../constants";
import type { AuditLogRow } from "../server/queries";
import { AuditLogTable } from "./audit-log-table";

type Props = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageCount: number;
  category?: AuditCategory;
};

export function AuditLogPage({ rows, total, page, pageCount, category }: Props) {
  const [, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<AuditCategory | undefined>(category);

  // Sync back when the loader resolves (handles browser back/forward)
  useEffect(() => {
    setActiveCategory(category);
  }, [category]);

  function handlePageChange(newPage: number) {
    setSearchParams((prev) => {
      prev.set("page", String(newPage));
      return prev;
    });
  }

  function handleCategory(cat: AuditCategory | undefined) {
    setActiveCategory(cat);
    setSearchParams((prev) => {
      if (cat) prev.set("category", cat);
      else prev.delete("category");
      prev.set("page", "1");
      return prev;
    });
  }

  return (
    <div className="max-w-[840px] mx-auto w-full space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => handleCategory(undefined)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !activeCategory
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          All
        </button>
        {(Object.entries(AUDIT_CATEGORY_LABELS) as [AuditCategory, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleCategory(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === key
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <AuditLogTable
        rows={rows}
        total={total}
        page={page}
        pageCount={pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
