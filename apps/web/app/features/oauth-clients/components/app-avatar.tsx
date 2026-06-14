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
}: {
  name?: string;
  icon?: string;
  clientId: string;
}) {
  const hash = clientId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  if (icon) {
    return (
      <img
        src={icon}
        alt={name ?? clientId}
        className="size-8 rounded-lg object-cover ring-1 ring-border shrink-0"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-xs font-bold shrink-0",
        color,
      )}
    >
      {(name ?? clientId).charAt(0).toUpperCase()}
    </div>
  );
}
