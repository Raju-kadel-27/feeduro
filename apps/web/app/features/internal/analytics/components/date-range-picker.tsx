import { cn } from "@lib/utils";
import { Link, useSearchParams } from "react-router";

const RANGES = [
  { value: "all", label: "All time" },
  { value: "90d", label: "90 days" },
  { value: "30d", label: "30 days" },
  { value: "7d", label: "7 days" },
] as const;

export function DateRangePicker() {
  const [searchParams] = useSearchParams();
  const current = searchParams.get("range") ?? "all";

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-1">
      {RANGES.map(({ value, label }) => {
        const params = new URLSearchParams(searchParams);
        params.set("range", value);
        return (
          <Link
            key={value}
            to={`?${params.toString()}`}
            className={cn(
              "px-3 py-1 text-xs rounded-md font-medium transition-colors",
              current === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
