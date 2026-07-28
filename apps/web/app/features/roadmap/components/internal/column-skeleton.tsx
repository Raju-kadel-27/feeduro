import { Skeleton } from "@components/ui/skeleton";
import { COLUMNS } from "../../constants";

export function ColumnSkeleton() {
  return (
    <div className="flex gap-3 h-full">
      {COLUMNS.map((col, ci) => (
        <div key={col.id} className="flex flex-col w-[300px] shrink-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-3 w-4" />
          </div>
          <div className="flex-1 rounded-xl border border-border/50 overflow-hidden min-h-[200px]">
            <div className="h-1 w-full bg-muted" />
            <div className="p-2 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-lg p-3 space-y-2.5 bg-card border border-border/60"
                  style={{ animationDelay: `${(ci * 3 + i) * 60}ms` }}
                >
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-3/5" />
                  <div className="flex items-center gap-2 pt-0.5">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="ml-auto flex gap-1">
                      <Skeleton className="h-4 w-8 rounded-full" />
                      <Skeleton className="h-4 w-6 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
