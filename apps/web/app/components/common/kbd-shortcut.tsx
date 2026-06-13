import { cn } from "@lib/utils";

interface Props {
  keys: string[];
  className?: string;
}

export function KbdShortcut({ keys, className }: Props) {
  return (
    <kbd
      className={cn(
        "hidden sm:flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[14px] font-medium text-muted-foreground",
        className,
      )}
    >
      {keys.map((k) => (
        <span key={k}>{k}</span>
      ))}
    </kbd>
  );
}
