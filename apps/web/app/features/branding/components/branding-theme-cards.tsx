import { cn } from "@lib/utils";

import type { ThemeValue } from "../constants/branding-options";

interface BrandingThemeCardsProps {
  value: ThemeValue;
  onChange: (value: ThemeValue) => void;
}

function LightThumbnail() {
  return (
    <div className="w-full h-14 rounded overflow-hidden bg-white border border-gray-200 flex">
      <div className="w-7 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col gap-1 p-1">
        <div className="h-1 w-full bg-gray-200 rounded-full" />
        <div className="h-1 w-3 bg-gray-200 rounded-full" />
        <div className="h-1 w-2 bg-gray-200 rounded-full" />
      </div>
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-1.5 w-full bg-gray-100 rounded-full" />
        <div className="h-1.5 w-4/5 bg-gray-100 rounded-full" />
        <div className="h-1.5 w-2/3 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

function DarkThumbnail() {
  return (
    <div className="w-full h-14 rounded overflow-hidden flex" style={{ backgroundColor: "#0f0f0f", border: "1px solid #2a2a2a" }}>
      <div className="w-7 shrink-0 flex flex-col gap-1 p-1" style={{ backgroundColor: "#1a1a1a", borderRight: "1px solid #2a2a2a" }}>
        <div className="h-1 w-full rounded-full" style={{ backgroundColor: "#333" }} />
        <div className="h-1 w-3 rounded-full" style={{ backgroundColor: "#333" }} />
        <div className="h-1 w-2 rounded-full" style={{ backgroundColor: "#333" }} />
      </div>
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "#222" }} />
        <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: "#222" }} />
        <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: "#222" }} />
      </div>
    </div>
  );
}

function DynamicThumbnail() {
  return (
    <div className="w-full h-14 rounded overflow-hidden relative flex border border-gray-200">
      <div className="w-1/2 bg-white flex flex-col gap-1 p-1.5">
        <div className="h-1 w-full bg-gray-200 rounded-full" />
        <div className="h-1 w-3/4 bg-gray-200 rounded-full" />
        <div className="h-1 w-1/2 bg-gray-200 rounded-full" />
      </div>
      <div className="w-1/2 flex flex-col gap-1 p-1.5" style={{ backgroundColor: "#0f0f0f" }}>
        <div className="h-1 w-full rounded-full" style={{ backgroundColor: "#333" }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: "#333" }} />
        <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: "#333" }} />
      </div>
      <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300/60" />
    </div>
  );
}

const CARDS: { value: ThemeValue; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "dynamic", label: "Dynamic" },
];

function ThemeThumbnail({ theme }: { theme: ThemeValue }) {
  if (theme === "light") return <LightThumbnail />;
  if (theme === "dark") return <DarkThumbnail />;
  return <DynamicThumbnail />;
}

export function BrandingThemeCards({ value, onChange }: BrandingThemeCardsProps) {
  return (
    <div className="flex gap-2">
      {CARDS.map((card) => (
        <button
          key={card.value}
          type="button"
          onClick={() => onChange(card.value)}
          className={cn(
            "flex flex-col gap-1.5 p-1.5 rounded-lg border transition-colors w-[90px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === card.value
              ? "border-primary bg-primary/5"
              : "border-border hover:border-foreground/30",
          )}
        >
          <ThemeThumbnail theme={card.value} />
          <span
            className={cn(
              "text-xs text-center font-medium",
              value === card.value ? "text-primary" : "text-muted-foreground",
            )}
          >
            {card.label}
          </span>
        </button>
      ))}
    </div>
  );
}
