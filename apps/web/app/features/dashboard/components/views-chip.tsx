import { cn } from "@lib/utils";
import { ChevronDown, Eye, X } from "lucide-react";
import { useRef, useState } from "react";
import type { View } from "../types";

interface ViewsChipProps {
  views: View[];
  activeViewId: string | null;
  activeView: View | undefined;
  viewCounts: Record<string, number>;
  onSwitchView: (viewId: string) => void;
  onClearView: () => void;
}

export function ViewsChip({
  views,
  activeViewId,
  activeView,
  viewCounts,
  onSwitchView,
  onClearView,
}: ViewsChipProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = !!activeViewId;

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

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
          <Eye className="h-3.5 w-3.5 shrink-0" />
          {isActive ? (
            <>
              <span className="text-muted-foreground font-normal">Views:</span>
              <span className="font-semibold">{activeView?.name ?? "View"}</span>
            </>
          ) : (
            <>
              <span>Views</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </>
          )}
        </button>
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClearView();
            }}
            className="pr-2 ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear view"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[220px] rounded-lg border border-border bg-popover shadow-lg dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <ul>
            {views.map((view) => {
              const isSelected = activeView?.id === view.id;
              const count = viewCounts[view.id];
              return (
                <li key={view.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchView(view.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[13.5px] hover:bg-accent transition-colors text-left",
                      isSelected && "bg-accent",
                    )}
                  >
                    <span className="text-base leading-none shrink-0">{view.emoji}</span>
                    <span className="flex-1 truncate">{view.name}</span>
                    {count != null && (
                      <span className="text-[12px] text-muted-foreground tabular-nums shrink-0">
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
