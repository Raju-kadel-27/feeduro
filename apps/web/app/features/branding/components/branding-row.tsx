import { cn } from "@lib/utils";
import type { ReactNode } from "react";

interface BrandingRowProps {
  children: ReactNode;
  className?: string;
}

export function BrandingRow({ children, className }: BrandingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-4 border-b border-border/70",
        className,
      )}
    >
      {children}
    </div>
  );
}
