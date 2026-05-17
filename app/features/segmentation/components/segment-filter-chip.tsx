import { cn } from "@lib/utils";
import { Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Segment } from "../types";

interface SegmentFilterChipProps {
  segments: Segment[];
  activeSegmentId: string | undefined;
  onSelect: (segmentId: string | undefined) => void;
}

export function SegmentFilterChip({ segments, activeSegmentId, onSelect }: SegmentFilterChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = segments.find((s) => s.id === activeSegmentId);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (segments.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13.5px] transition-colors border",
          active
            ? "bg-[#18181b] text-white border-[#18181b]"
            : "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] border-[#d4d4d8]",
        )}
      >
        {active ? (
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: active.color }}
          />
        ) : (
          <Users className="h-3 w-3" />
        )}
        {active ? active.name : "Segment"}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-lg border border-[#ececec] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          {activeSegmentId && (
            <button
              type="button"
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-[13.5px] text-left text-[#71717a] hover:bg-[#f4f4f5] transition-colors border-b border-[#f4f4f5]"
            >
              Clear segment
            </button>
          )}
          {segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => {
                onSelect(seg.id === activeSegmentId ? undefined : seg.id);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-[13.5px] text-left flex items-center gap-2 hover:bg-[#f4f4f5] transition-colors",
                seg.id === activeSegmentId && "font-medium",
              )}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="flex-1 truncate">{seg.name}</span>
              {seg.memberCount != null && (
                <span className="text-[12px] text-[#a1a1aa] tabular-nums shrink-0">
                  {seg.memberCount.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
