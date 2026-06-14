export function GroupHeader({
  label,
  count,
  hexColor,
}: {
  label: string;
  count: number;
  hexColor: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: hexColor }} />
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground font-mono">{count}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
