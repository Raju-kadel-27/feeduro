import type { BillingInterval } from "./plans";

type BillingToggleProps = {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  disabled?: boolean;
  note?: string;
};

export function BillingToggle({ value, onChange, disabled, note }: BillingToggleProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`flex items-center gap-3 ${disabled ? "pointer-events-none opacity-40" : ""}`}
      >
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={`text-sm font-medium transition-colors ${
            value === "monthly"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={value === "annual"}
          onClick={() => onChange(value === "monthly" ? "annual" : "monthly")}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === "annual" ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
              value === "annual" ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => onChange("annual")}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            value === "annual"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly
          <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-500">
            Save ~33%
          </span>
        </button>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
