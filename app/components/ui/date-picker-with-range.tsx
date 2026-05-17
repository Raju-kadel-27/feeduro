import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { cn } from "@lib/utils"

interface DatePickerWithRangeProps {
  value?: DateRange
  onChange?: (date: DateRange | undefined) => void
  onClear?: () => void
  placeholder?: string
  className?: string
}

export function DatePickerWithRange({
  value,
  onChange,
  onClear,
  placeholder = "Date range",
  className,
}: DatePickerWithRangeProps) {
  const [internalDate, setInternalDate] = useState<DateRange | undefined>()

  const date = value ?? internalDate
  const handleSelect = (range: DateRange | undefined) => {
    if (onChange) {
      onChange(range)
    } else {
      setInternalDate(range)
    }
  }

  let label: React.ReactNode = <span className="opacity-60">{placeholder}</span>
  if (date?.from) {
    label = date.to ? (
      <>
        {format(date.from, "MMM d")} – {format(date.to, "MMM d")}
      </>
    ) : (
      format(date.from, "MMM d")
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            className,
          )}
          variant="outline"
        >
          <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
          <span className="flex-1 truncate">{label}</span>
          {date && onClear && (
            <span
              role="button"
              tabIndex={-1}
              className="ml-1 shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.stopPropagation(); onClear() }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-auto min-w-max p-0">
        <Calendar mode="range" numberOfMonths={2} onSelect={handleSelect} selected={date} />
      </PopoverContent>
    </Popover>
  )
}
