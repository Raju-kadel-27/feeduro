import { cn } from "@lib/utils";
import { STATUS } from "../constants";
import type { StatusKey } from "../schemas/public";

export function StatusFilterChip({
  id,
  active,
  onClick,
}: {
  id: StatusKey;
  active: boolean;
  onClick: () => void;
}) {
  const s = STATUS[id];
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-8 text-xs font-medium transition-colors",
        active
          ? "border-current text-foreground"
          : "border-slate-200 text-slate-600 hover:text-slate-900",
      )}
      style={active ? { borderColor: s.dot, color: s.dot } : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </button>
  );
}
