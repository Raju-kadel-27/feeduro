interface WidgetHeaderProps {
  view: "feed" | "detail";
  orgName: string;
  boardName?: string;
  boardDescription?: string | null;
  onBackClick: () => void;
}

export function WidgetHeader({
  view,
  orgName,
  boardName,
  boardDescription,
  onBackClick,
}: WidgetHeaderProps) {
  if (view === "detail") {
    return (
      <header className="flex items-center justify-between px-4 h-12 border-b border-border/70 shrink-0 bg-background/95 backdrop-blur">
        <button
          type="button"
          onClick={onBackClick}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <span className="font-semibold text-[13px]">Post Detail</span>
        <div className="w-14" />
      </header>
    );
  }

  return (
    <header className="px-5 pt-5 pb-4 border-b border-border/70 shrink-0">
      <h1 className="text-base font-semibold leading-tight truncate">
        {boardName ?? orgName}
      </h1>
      {boardDescription && (
        <p className="mt-0.5 text-[13px] text-muted-foreground leading-snug line-clamp-2">
          {boardDescription}
        </p>
      )}
    </header>
  );
}
