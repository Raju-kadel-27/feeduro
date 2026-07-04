import { CompanyMonogram } from "@features/internal/segmentation/components/company-monogram";
import type { CompanyVoter } from "@features/internal/segmentation/types";
import { formatMrr } from "@utils/format-mrr";
import { Building2 } from "lucide-react";

function SkeletonRows() {
  return (
    <div className="space-y-1 animate-pulse" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="h-6 w-6 rounded-[6px] bg-muted" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 w-24 rounded bg-muted" />
            <div className="h-2 w-12 rounded bg-muted" />
          </div>
          <div className="h-3 w-10 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function PostCompanyList({
  companies,
  isLoading,
}: {
  companies: CompanyVoter[];
  isLoading: boolean;
}) {
  return (
    <div className="px-5 pb-6 border-t pt-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        Companies
        {!isLoading && companies.length > 0 && (
          <span className="ml-0.5 tabular-nums font-normal normal-case tracking-normal">
            {companies.length}
          </span>
        )}
      </h3>

      {isLoading ? (
        <SkeletonRows />
      ) : companies.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          No identified companies yet. Send a <span className="font-medium">company</span> with your
          voters (widget or CSV) to see which accounts want this.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {companies.map((c) => (
            <li
              key={c.companyId}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
            >
              <CompanyMonogram name={c.name} seed={c.companyId} size={24} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {c.name ?? "Unknown company"}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground tabular-nums">
                  {c.voterCount} {c.voterCount === 1 ? "voter" : "voters"}
                </p>
              </div>
              {c.mrr > 0 && (
                <span className="shrink-0 tabular-nums text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatMrr(c.mrr)}
                  <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
