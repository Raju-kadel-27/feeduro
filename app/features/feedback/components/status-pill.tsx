import { STATUS } from "../constants";
import type { StatusKey } from "../schemas/public";

export function StatusPill({ id }: { id: StatusKey }) {
  const s = STATUS[id];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}
