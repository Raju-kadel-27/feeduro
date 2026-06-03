import { cn } from "@lib/utils";
import type { ReactNode } from "react";

interface ChipPopoverProps {
  children: ReactNode;
  className?: string;
}

export function ChipPopover({ children, className }: ChipPopoverProps) {
  return (
    <div
      className={cn(
        "absolute top-full left-0 mt-1.5 z-50 min-w-[220px] rounded-lg border border-border bg-popover shadow-lg dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
