export const COLOR_OPTIONS = [
  { value: "indigo", label: "Indigo", hex: "#6366f1" },
  { value: "blue", label: "Blue", hex: "#3b82f6" },
  { value: "sky", label: "Sky", hex: "#0ea5e9" },
  { value: "cyan", label: "Cyan", hex: "#06b6d4" },
  { value: "teal", label: "Teal", hex: "#14b8a6" },
  { value: "emerald", label: "Emerald", hex: "#10b981" },
  { value: "green", label: "Green", hex: "#22c55e" },
  { value: "lime", label: "Lime", hex: "#84cc16" },
  { value: "yellow", label: "Yellow", hex: "#eab308" },
  { value: "amber", label: "Amber", hex: "#f59e0b" },
  { value: "orange", label: "Orange", hex: "#f97316" },
  { value: "red", label: "Red", hex: "#ef4444" },
  { value: "rose", label: "Rose", hex: "#f43f5e" },
  { value: "pink", label: "Pink", hex: "#ec4899" },
  { value: "fuchsia", label: "Fuchsia", hex: "#d946ef" },
  { value: "purple", label: "Purple", hex: "#a855f7" },
  { value: "violet", label: "Violet", hex: "#8b5cf6" },
  { value: "zinc", label: "Zinc", hex: "#71717a" },
] as const;

export const THEME_OPTIONS = [
  { value: "dynamic", label: "Dynamic" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
] as const;

export type ColorValue = (typeof COLOR_OPTIONS)[number]["value"];
export type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];
export type LanguageValue = (typeof LANGUAGE_OPTIONS)[number]["value"];
