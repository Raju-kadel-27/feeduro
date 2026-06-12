import { cn } from "@lib/utils";
import { Check } from "lucide-react";

import { COLOR_OPTIONS, type ColorValue } from "../constants/branding-options";

interface BrandingColorSelectProps {
  value: ColorValue;
  onChange: (value: ColorValue) => void;
}

export function BrandingColorSelect({ value, onChange }: BrandingColorSelectProps) {
  return (
    <div className="flex flex-wrap gap-2 max-w-[220px]">
      {COLOR_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative size-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          )}
          style={{
            backgroundColor: option.hex,
            ...(value === option.value
              ? { outline: `2px solid ${option.hex}`, outlineOffset: "3px" }
              : {}),
          }}
        >
          {value === option.value && (
            <Check
              className="absolute inset-0 m-auto size-3 text-white drop-shadow-sm"
              strokeWidth={3}
            />
          )}
        </button>
      ))}
    </div>
  );
}
