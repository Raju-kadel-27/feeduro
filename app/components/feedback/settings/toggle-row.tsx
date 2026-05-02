import { Info } from "lucide-react";

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({ label, hint, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
        <span>{label}</span>
        {hint && (
          <span title={hint}>
            <Info size={12} className="text-muted-foreground" />
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full",
          "border transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-amber-500 border-amber-500" : "bg-muted border-border",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform",
            checked ? "translate-x-[15px]" : "translate-x-[1px]",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
