import { Check } from "lucide-react";

type Board = { id: string; name: string; isDefault: boolean };

type Props = {
  boards: Board[];
  boardId: string;
  setBoardId: (v: string) => void;
  position: "left" | "right";
  setPosition: (v: "left" | "right") => void;
  theme: "light" | "dark" | "auto";
  setTheme: (v: "light" | "dark" | "auto") => void;
  onSave: () => void;
  isSaving: boolean;
  savedOk: boolean | undefined;
  hasError: boolean;
};

export function SettingsConfigSection({
  boards,
  boardId,
  setBoardId,
  position,
  setPosition,
  theme,
  setTheme,
  onSave,
  isSaving,
  savedOk,
  hasError,
}: Props) {
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {boards.length > 0 && (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Board
              </span>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
              >
                <option value="">Default</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.isDefault ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-px h-5 bg-border hidden sm:block" />
          </>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Position
          </span>
          <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
            {(["right", "left"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPosition(v)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  position === v
                    ? "bg-background text-foreground font-medium shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "right" ? "Right" : "Left"}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-border hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Theme</span>
          <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
            {(["auto", "light", "dark"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTheme(v)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-all ${
                  theme === v
                    ? "bg-background text-foreground font-medium shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {hasError && (
            <span className="text-xs text-destructive">Save failed — please try again.</span>
          )}
          {!isSaving && savedOk && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </section>
  );
}
