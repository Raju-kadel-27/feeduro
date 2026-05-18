import { ADMIN_STATUS_CONFIG } from "@features/feedback/constants";
import type { AdminStatus } from "@features/feedback/schemas/admin";
import { cn } from "@lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { StatusCircleIcon } from "./status-circle-icon";

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

  if (!isAdmin) {
    return (
      <span
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          cfg.bgColor,
          cfg.textColor,
        )}
      >
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: cfg.dotColor }}
        />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
          cfg.bgColor,
          cfg.textColor,
        )}
      >
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: cfg.dotColor }}
        />
        {cfg.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-lg border bg-popover shadow-lg py-1">
            {(Object.entries(ADMIN_STATUS_CONFIG) as [AdminStatus, StatusConfig][]).map(
              ([s, c]) => (
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
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
