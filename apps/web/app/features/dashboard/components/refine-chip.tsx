import { cn } from "@lib/utils";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface ChipOption {
  value: string;
  label: string;
  color?: string;
  count?: number;
}

interface RefineChipProps {
  label: string;
  options: ChipOption[];
  /** Currently selected values (multi-select) */
  selected: string[];
  /** For single-select (date) */
  singleSelected?: string;
  multiSelect?: boolean;
  /** Show chip at all */
  hidden?: boolean;
  onSelect: (value: string) => void;
  onClear: () => void;
}

export function RefineChip({
  label,
  options,
  selected,
  singleSelected,
  multiSelect = true,
  hidden,
  onSelect,
  onClear,
}: RefineChipProps) {
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

  if (hidden) return null;

  const isActive = multiSelect ? selected.length > 0 : !!singleSelected;
  const activeLabel = multiSelect
    ? selected.length === 1
      ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} selected`
    : (options.find((o) => o.value === singleSelected)?.label ?? singleSelected ?? "");

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <div
        className={cn(
          "inline-flex items-center rounded-md text-[13.5px] transition-colors",
          isActive
            ? "border border-border bg-accent font-medium text-foreground"
            : "border border-dashed border-border text-muted-foreground hover:bg-accent hover:border-solid hover:text-foreground",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1"
        >
          {isActive ? (
            <>
              <span className="text-muted-foreground font-normal">{label}:</span>
              <span className="font-semibold">{activeLabel}</span>
            </>
          ) : (
            <>
              <span>{label}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </>
          )}
        </button>
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="pr-2 ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Clear ${label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[220px] rounded-lg border border-border bg-popover shadow-lg dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <ul>
            {options.map((opt) => {
              const checked = multiSelect
                ? selected.includes(opt.value)
                : singleSelected === opt.value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(opt.value);
                      if (!multiSelect) setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[13.5px] hover:bg-accent transition-colors text-left",
                      checked && "bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded-sm border-[1.5px] shrink-0 flex items-center justify-center transition-colors",
                        checked ? "bg-foreground border-foreground" : "border-border",
                      )}
                    >
                      {checked && (
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
                    {opt.color && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {opt.count != null && (
                      <span className="text-[12px] text-muted-foreground tabular-nums shrink-0">
                        {opt.count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {multiSelect && selected.length > 0 && (
            <div className="border-t border-border">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-[13px] text-muted-foreground hover:bg-accent text-left transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface BooleanChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export function BooleanChip({ label, active, onToggle, onClear }: BooleanChipProps) {
  if (!active) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13.5px] border font-medium transition-colors border-dashed border-border text-muted-foreground hover:bg-accent hover:border-solid hover:text-foreground"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-md text-[13.5px] border font-medium border-border bg-accent text-foreground">
      <span className="pl-2.5 py-1">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Clear ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
