import { cn } from "@lib/utils";

// Deterministic color per company so the same company reads the same everywhere (Canny/Linear style).
const MONOGRAM_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-blue-500",
];

export function CompanyMonogram({
  name,
  seed,
  size = 24,
}: {
  name: string | null;
  /** Stable id used to pick the color so it never changes on rename. Falls back to name. */
  seed?: string;
  size?: number;
}) {
  const display = name?.trim() || "?";
  const key = seed ?? display;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const color = MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
  const initials = display.slice(0, 2).toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[6px] font-semibold text-white",
        color,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
