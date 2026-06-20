import { DateRangePicker } from "@components/ui/date-range-picker/date-range-picker";
import { cn } from "@lib/utils";
import { format, parse } from "date-fns";
import { ChevronDown, X } from "lucide-react";
import { useRef, useState } from "react";

interface DateRangeChipProps {
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  hidden?: boolean;
  onSetRefinements: (updates: Array<[string, string | undefined]>) => void;
}

export function DateRangeChip({
  dateFrom,
  dateTo,
  hidden,
  onSetRefinements,
}: DateRangeChipProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (hidden) return null;

  const isActive = !!dateFrom || !!dateTo;

  let activeLabel = "";
  if (dateFrom || dateTo) {
    const from = dateFrom ? format(parse(dateFrom, "yyyy-MM-dd", new Date()), "MMM d") : "";
    const to = dateTo ? format(parse(dateTo, "yyyy-MM-dd", new Date()), "MMM d") : "";
    if (from && to) activeLabel = `${from} – ${to}`;
    else if (from) activeLabel = `From ${from}`;
    else activeLabel = `Until ${to}`;
  }

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onSetRefinements([["date", undefined], ["dateFrom", undefined], ["dateTo", undefined]]);
  }

  const chipTrigger = (
    <div
      className={cn(
        "inline-flex items-center rounded-md text-[17px] transition-colors cursor-pointer select-none",
        isActive
          ? "border border-border bg-accent font-medium text-foreground"
          : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1">
        {isActive ? (
          <>
            <span className="text-muted-foreground font-normal">Date:</span>
            <span className="font-semibold">{activeLabel}</span>
          </>
        ) : (
          <>
            <span>Date range</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </>
        )}
      </span>
      {isActive && (
        <span
          role="button"
          tabIndex={-1}
          onClick={clear}
          onKeyDown={(e) => e.key === "Enter" && clear(e as unknown as React.MouseEvent)}
          className="pr-2 ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </div>
  );

  return (
    <div onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      {/*
       * key forces a remount whenever the URL dates change so the picker's
       * internal calendar state stays in sync with the chip label — e.g. after
       * the user clears the filter via the X button.
       */}
      <DateRangePicker
        key={`${dateFrom ?? ""}-${dateTo ?? ""}`}
        initialDateFrom={dateFrom ? parse(dateFrom, "yyyy-MM-dd", new Date()) : undefined}
        initialDateTo={dateTo ? parse(dateTo, "yyyy-MM-dd", new Date()) : undefined}
        align="start"
        alignOffset={-80}
        showCompare={false}
        trigger={chipTrigger}
        open={open}
        onOpenChange={setOpen}
        onMouseEnterContent={openMenu}
        onMouseLeaveContent={scheduleClose}
        onUpdate={(values) => {
          const from = values.range.from;
          const to = values.range.to ?? values.range.from;
          onSetRefinements([
            ["date", undefined],
            ["dateFrom", format(from, "yyyy-MM-dd")],
            ["dateTo", format(to, "yyyy-MM-dd")],
          ]);
        }}
      />
    </div>
  );
}
