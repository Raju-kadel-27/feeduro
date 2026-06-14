import { X } from "lucide-react";
import { ChipOptionRow } from "./chip-option-row";
import { ChipPopover } from "./chip-popover";
import { ChipTrigger } from "./chip-trigger";

export interface ChipOption {
  value: string;
  label: string;
  color?: string;
  count?: number;
}

interface RefineChipProps {
  label: string;
  options: ChipOption[];
  selected: string[];
  singleSelected?: string;
  multiSelect?: boolean;
  hidden?: boolean;
  onSelect: (value: string) => void;
  onClear: () => void;
}

export function RefineChip({
  label,
  options,
  selected,
  singleSelected,
  multiSelect = true,
  hidden,
  onSelect,
  onClear,
}: RefineChipProps) {
  if (hidden) return null;

  const isActive = multiSelect ? selected.length > 0 : !!singleSelected;
  const activeLabel = isActive
    ? multiSelect
      ? selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`
      : (options.find((o) => o.value === singleSelected)?.label ?? singleSelected ?? "")
    : undefined;

  return (
    <ChipTrigger label={label} isActive={isActive} activeLabel={activeLabel} onClear={onClear}>
      {(close) => (
        <ChipPopover>
          <ul>
            {options.map((opt) => {
              const checked = multiSelect ? selected.includes(opt.value) : singleSelected === opt.value;
              return (
                <li key={opt.value}>
                  <ChipOptionRow
                    label={opt.label}
                    isSelected={checked}
                    count={opt.count}
                    showCheckbox
                    prefix={
                      opt.color ? (
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      ) : undefined
                    }
                    onClick={() => {
                      onSelect(opt.value);
                      if (!multiSelect) close();
                    }}
                  />
                </li>
              );
            })}
          </ul>
          {multiSelect && selected.length > 0 && (
            <div className="border-t border-border">
              <button
                type="button"
                onClick={() => { onClear(); close(); }}
                className="w-full px-3 py-2 text-[15px] text-red-500 hover:bg-accent text-left transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </ChipPopover>
      )}
    </ChipTrigger>
  );
}

interface BooleanChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export function BooleanChip({ label, active, onToggle, onClear }: BooleanChipProps) {
  if (!active) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[17px] border font-medium transition-colors border-border/40 text-muted-foreground hover:bg-accent hover:border-border hover:text-foreground"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-md text-[17px] border font-medium border-border bg-accent text-foreground">
      <span className="pl-2.5 py-1">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Clear ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
