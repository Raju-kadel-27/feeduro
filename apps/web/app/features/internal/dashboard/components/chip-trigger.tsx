import { cn } from "@lib/utils";
import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface ChipTriggerProps {
  label: string;
  isActive: boolean;
  /** When set, renders "label: activeLabel" format instead of "label + chevron" */
  activeLabel?: string;
  /** Whether activeLabel is bolded — only when isActive (default true) */
  boldActive?: boolean;
  onClear?: () => void;
  icon?: ReactNode;
  /** Render prop receives a close() fn so option clicks can close the popover */
  children?: ReactNode | ((close: () => void) => ReactNode);
}

export function ChipTrigger({
  label,
  isActive,
  activeLabel,
  boldActive = true,
  onClear,
  icon,
  children,
}: ChipTriggerProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  const close = () => setOpen(false);

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <div
        className={cn(
          "inline-flex items-center rounded-md text-[17px] transition-colors",
          isActive
            ? "border border-border bg-accent font-medium text-foreground"
            : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1"
        >
          {icon}
          {activeLabel != null ? (
            <>
              <span className="text-muted-foreground font-normal">{label}:</span>
              <span className={cn(boldActive && isActive && "font-semibold")}>{activeLabel}</span>
            </>
          ) : (
            <>
              <span>{label}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </>
          )}
        </button>
        {isActive && onClear && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="pr-2 ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Clear ${label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && (typeof children === "function" ? children(close) : children)}
    </div>
  );
}
