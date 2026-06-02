import type { WidgetMode } from "../types";

interface WidgetHeaderProps {
  view: "feed" | "submit";
  orgName: string;
  boardName?: string;
  boardDescription?: string | null;
  mode: WidgetMode;
  hasBoard: boolean;
  onSubmitClick: () => void;
  onBackClick: () => void;
}

export function WidgetHeader({
  view,
  orgName,
  boardName,
  boardDescription,
  mode,
  hasBoard,
  onSubmitClick,
  onBackClick,
}: WidgetHeaderProps) {
  if (view === "submit") {
    return (
      <header className="flex items-center justify-between px-4 h-12 border-b border-border/70 shrink-0 bg-background/95 backdrop-blur">
        <button
          onClick={onBackClick}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <span className="font-semibold text-[13px]">Give Feedback</span>
        <div className="w-14" />
      </header>
    );
  }

  if (mode === "inline") {
    return (
      <header className="px-5 pt-5 pb-4 border-b border-border/70 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight truncate">
              {boardName ?? orgName}
            </h1>
            {boardDescription && (
              <p className="mt-0.5 text-[13px] text-muted-foreground leading-snug line-clamp-2">
                {boardDescription}
              </p>
            )}
          </div>
          {hasBoard && (
            <button
              onClick={onSubmitClick}
              className="shrink-0 px-3 h-8 rounded-full bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
            >
              + New Post
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-border/70 shrink-0 bg-background/95 backdrop-blur">
      <span className="font-semibold text-[13px] truncate leading-none">{orgName}</span>
      {hasBoard && (
        <button
          onClick={onSubmitClick}
          className="shrink-0 ml-2 px-3 h-7 rounded-full bg-primary text-primary-foreground text-[11.5px] font-medium hover:bg-primary/90 transition-colors"
        >
          + Give Feedback
        </button>
      )}
    </header>
  );
}
