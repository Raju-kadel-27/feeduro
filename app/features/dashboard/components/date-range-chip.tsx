import { Calendar } from "@components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { cn } from "@lib/utils";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "Last 30 days" },
  { value: "stale", label: "Over 14 days" },
];

interface DateRangeChipProps {
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  hidden?: boolean;
  onSetRefinement: (key: string, value: string | undefined) => void;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function timeFromIso(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function DateRangeChip({
  datePreset,
  dateFrom,
  dateTo,
  hidden,
  onSetRefinement,
}: DateRangeChipProps) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>();
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");

  useEffect(() => {
    if (!open) return;
    setPendingRange(
      dateFrom || dateTo
        ? {
            from: dateFrom ? new Date(dateFrom) : undefined,
            to: dateTo ? new Date(dateTo) : undefined,
          }
        : undefined,
    );
    setFromTime(dateFrom ? timeFromIso(dateFrom) : "00:00");
    setToTime(dateTo ? timeFromIso(dateTo) : "23:59");
  }, [open, dateFrom, dateTo]);

  if (hidden) return null;

  const isActive = !!datePreset || !!dateFrom || !!dateTo;

  let label = "Date";
  if (datePreset) {
    label = DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? "Date";
  } else if (dateFrom || dateTo) {
    const from = dateFrom ? format(new Date(dateFrom), "MMM d") : "";
    const to = dateTo ? format(new Date(dateTo), "MMM d") : "";
    if (from && to) label = `${from} – ${to}`;
    else if (from) label = `From ${from}`;
    else label = `Until ${to}`;
  }

  function applyCustomRange() {
    if (!pendingRange?.from && !pendingRange?.to) return;
    onSetRefinement("date", undefined);
    onSetRefinement(
      "dateFrom",
      pendingRange.from
        ? combineDateAndTime(pendingRange.from, fromTime).toISOString()
        : undefined,
    );
    onSetRefinement(
      "dateTo",
      pendingRange.to ? combineDateAndTime(pendingRange.to, toTime).toISOString() : undefined,
    );
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onSetRefinement("date", undefined);
    onSetRefinement("dateFrom", undefined);
    onSetRefinement("dateTo", undefined);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] border transition-colors",
            isActive
              ? "bg-[#18181b] text-white border-[#18181b]"
              : "text-[#71717a] border-[#d4d4d8] hover:bg-[#f4f4f5] hover:text-[#18181b]",
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {label}
          {isActive && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              onKeyDown={(e) => e.key === "Enter" && clear(e as unknown as React.MouseEvent)}
              className="ml-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="![width:700px] p-0 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
      >
        <div className="flex">
          {/* Presets — vertical left panel */}
          <div className="w-36 shrink-0 border-r border-[#ececec] p-2 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#a1a1aa] px-2 py-1">
              Quick select
            </p>
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  onSetRefinement("date", preset.value);
                  onSetRefinement("dateFrom", undefined);
                  onSetRefinement("dateTo", undefined);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-[13px] rounded hover:bg-[#f4f4f5] transition-colors",
                  datePreset === preset.value && "bg-[#f4f4f5] font-semibold text-[#18181b]",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar + time inputs */}
          <div className="p-3">
            <p className="text-[11px] text-[#a1a1aa] font-medium mb-2 uppercase tracking-wide">
              Custom range
            </p>
            <Calendar
              mode="range"
              selected={pendingRange}
              onSelect={setPendingRange}
              numberOfMonths={2}
              defaultMonth={pendingRange?.from}
            />
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#ececec]">
              <label className="flex items-center gap-1.5 text-[12px] text-[#71717a]">
                From
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                  className="text-[12px] text-[#18181b] border border-[#d4d4d8] rounded px-1.5 py-0.5"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-[#71717a]">
                To
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  className="text-[12px] text-[#18181b] border border-[#d4d4d8] rounded px-1.5 py-0.5"
                />
              </label>
              <button
                type="button"
                onClick={applyCustomRange}
                disabled={!pendingRange?.from && !pendingRange?.to}
                className="ml-auto px-3 py-1 text-[12px] rounded-md bg-[#18181b] text-white hover:bg-[#27272a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
