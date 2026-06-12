import { cn } from "@lib/utils";
import type { ReactNode } from "react";

interface BrandingRowProps {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function BrandingRow({ label, description, htmlFor, children, className }: BrandingRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-6 py-4 border-b border-border/70",
        className,
      )}
    >
      <div className="space-y-1 pt-0.5">
        <label
          htmlFor={htmlFor}
          className={cn(
            "text-sm font-medium text-foreground leading-none",
            !htmlFor && "cursor-default select-none",
          )}
        >
          {label}
        </label>
        {description && <p className="text-xs text-muted-foreground leading-snug">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
