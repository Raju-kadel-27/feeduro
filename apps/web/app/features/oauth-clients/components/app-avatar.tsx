import { cn } from "@lib/utils";

const AVATAR_COLORS = [
  "bg-violet-500/15 text-violet-600",
  "bg-blue-500/15 text-blue-600",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
  "bg-rose-500/15 text-rose-600",
  "bg-sky-500/15 text-sky-600",
];

export function AppAvatar({
  name,
  icon,
  clientId,
  size = "md",
}: {
  name?: string;
  icon?: string;
  clientId: string;
  size?: "md" | "lg";
}) {
  const hash = clientId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const sizeClass = size === "lg" ? "size-10 rounded-xl text-sm" : "size-8 rounded-lg text-xs";

  if (icon) {
    return (
      <img
        src={icon}
        alt={name ?? clientId}
        className={cn(sizeClass, "object-cover ring-1 ring-border shrink-0")}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center font-bold shrink-0",
        sizeClass,
        color,
      )}
    >
      {(name ?? clientId).charAt(0).toUpperCase()}
    </div>
  );
}
