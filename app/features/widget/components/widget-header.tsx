interface WidgetHeaderProps {
  view: "feed" | "submit";
  orgName: string;
  hasBoard: boolean;
  onSubmitClick: () => void;
  onBackClick: () => void;
}

export function WidgetHeader({
  view,
  orgName,
  hasBoard,
  onSubmitClick,
  onBackClick,
}: WidgetHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-border/70 shrink-0 bg-background/95 backdrop-blur">
      {view === "feed" ? (
        <>
          <span className="font-semibold text-[13px] truncate leading-none">{orgName}</span>
          {hasBoard && (
            <button
              onClick={onSubmitClick}
              className="shrink-0 ml-2 px-3 h-7 rounded-full bg-primary text-primary-foreground text-[11.5px] font-medium hover:bg-primary/90 transition-colors"
            >
              + Give Feedback
            </button>
          )}
        </>
      ) : (
        <>
          <button
            onClick={onBackClick}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <span className="font-semibold text-[13px]">Give Feedback</span>
          <div className="w-14" />
        </>
      )}
    </header>
  );
}