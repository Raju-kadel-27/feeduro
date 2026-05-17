import { STATUS } from "../constants";
import type { StatusKey } from "../constants";

interface StatusPillProps {
  id: StatusKey;
}

export function StatusPill({ id }: StatusPillProps) {
  const s = STATUS[id];
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border border-border/60 text-foreground/60">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}