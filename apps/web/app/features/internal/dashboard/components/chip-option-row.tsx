import { cn } from "@lib/utils";
import type { ReactNode } from "react";

interface ChipOptionRowProps {
  label: string;
  isSelected?: boolean;
  count?: number;
  onClick: () => void;
  /** Leading adornment — emoji, color dot, icon, etc. */
  prefix?: ReactNode;
  showCheckbox?: boolean;
}

export function ChipOptionRow({
  label,
  isSelected,
  count,
  onClick,
  prefix,
  showCheckbox,
}: ChipOptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-[17px] hover:bg-accent transition-colors text-left",
        isSelected && "bg-accent",
      )}
    >
      {showCheckbox && (
        <span
          className={cn(
            "h-3.5 w-3.5 rounded-sm border-[1.5px] shrink-0 flex items-center justify-center transition-colors",
            isSelected ? "bg-foreground border-foreground" : "border-border",
          )}
        >
          {isSelected && (
            <svg className="h-2 w-2 text-white" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}
      {prefix}
      <span className="flex-1 truncate">{label}</span>
      {count != null && (
        <span className="text-[14px] text-muted-foreground tabular-nums shrink-0">{count}</span>
      )}
    </button>
  );
}
