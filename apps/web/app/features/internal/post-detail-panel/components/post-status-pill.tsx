import { ADMIN_STATUS_CONFIG } from "@features/feedback/constants";
import type { AdminStatus } from "@features/feedback/schemas/admin";
import { StatusCircleIcon } from "@features/roadmap/components/status-circle-icon";
import { cn } from "@lib/utils";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type StatusConfig = (typeof ADMIN_STATUS_CONFIG)[AdminStatus];

export function StatusPill({
  cfg,
  isAdmin,
  status,
  onUpdate,
}: {
  cfg: StatusConfig;
  isAdmin: boolean;
  status: AdminStatus;
  onUpdate: (s: AdminStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  }

  if (!isAdmin) {
    return (
      <span
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
          cfg.textColor,
        )}
        style={{ borderColor: cfg.dotColor }}
      >
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dotColor }} />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
          cfg.textColor,
        )}
        style={{ borderColor: cfg.dotColor }}
      >
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dotColor }} />
        {cfg.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[101] w-40 rounded-lg border bg-popover shadow-lg py-1"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {(Object.entries(ADMIN_STATUS_CONFIG) as [AdminStatus, StatusConfig][]).map(([s, c]) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onUpdate(s);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                  s === status && "font-semibold",
                )}
              >
                <StatusCircleIcon status={s} size={12} />
                {c.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
