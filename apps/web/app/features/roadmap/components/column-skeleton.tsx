import { Skeleton } from "@components/ui/skeleton";
import { cn } from "@lib/utils";
import { COLUMNS } from "../constants";

export function ColumnSkeleton() {
  return (
    <div className="flex gap-3 h-full">
      {COLUMNS.map((col, ci) => (
        <div key={col.id} className="flex flex-col w-[300px] shrink-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", col.dot)} />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="ml-auto h-3 w-4" />
          </div>
          <div className="flex-1 rounded-lg border border-border/60 bg-muted/40 p-1.5 min-h-[320px] space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-md p-3 space-y-2.5 bg-background border border-border"
                style={{ animationDelay: `${(ci * 3 + i) * 60}ms` }}
              >
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-3/5" />
                <div className="flex items-center gap-2 pt-0.5">
                  <Skeleton className="h-3 w-6" />
                  <Skeleton className="h-3 w-5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
