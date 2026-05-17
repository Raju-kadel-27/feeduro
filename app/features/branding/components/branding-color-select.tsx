import { cn } from "@lib/utils";

import { COLOR_OPTIONS, type ColorValue } from "../constants/branding-options";

interface BrandingColorSelectProps {
  value: ColorValue;
  onChange: (value: ColorValue) => void;
}

export function BrandingColorSelect({ value, onChange }: BrandingColorSelectProps) {
  const selected = COLOR_OPTIONS.find((option) => option.value === value);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <span
          className="size-2.5 rounded-full"
          style={{
            background: selected?.hex,
          }}
        />
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ColorValue)}
        className={cn(
          "h-8 appearance-none rounded-md border border-border bg-transparent pl-7 pr-8 text-xs font-medium shadow-sm",
        )}
      >
        {COLOR_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
