import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import { Check } from "lucide-react";

type Board = { id: string; name: string; slug: string; isDefault: boolean };

type Props = {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  isTogglingEnabled: boolean;
  boards: Board[];
  boardId: string;
  setBoardId: (v: string) => void;
  theme: "light" | "dark" | "auto";
  setTheme: (v: "light" | "dark" | "auto") => void;
  onSave: () => void;
  isSaving: boolean;
  savedOk: boolean | undefined;
  hasError: boolean;
};

const BOARD_NONE = "__none__";

export function SettingsConfigSection({
  enabled,
  onToggle,
  isTogglingEnabled,
  boards,
  boardId,
  setBoardId,
  theme,
  setTheme,
  onSave,
  isSaving,
  savedOk,
  hasError,
}: Props) {
  return (
    <section className="rounded-xl border border-border bg-card">
      {/* Enable toggle */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p id="widget-enabled-label" className="text-base font-medium">Widget enabled</p>
          <p className="text-sm text-muted-foreground mt-1">
            When off, all embed iframes on your users' sites return 404.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={isTogglingEnabled}
          aria-labelledby="widget-enabled-label"
        />
      </div>

      <div className="border-t border-border/60" />

      {/* Default board + theme + save */}
      <div className="px-5 py-4 space-y-4">
        {boards.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Default board
              </span>
              <Select
                value={boardId || BOARD_NONE}
                onValueChange={(v) => setBoardId(v === BOARD_NONE ? "" : v)}
              >
                <SelectTrigger className="h-8 text-sm w-auto min-w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BOARD_NONE}>Auto — first public board</SelectItem>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      <span className="ml-1.5 text-muted-foreground font-mono text-[11px]">
                        ({b.slug})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Shown when an embed has no <code className="bg-muted px-1 py-0.5 rounded">data-fdy-board</code> attribute.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Theme</span>
            <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
              {(["auto", "light", "dark"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTheme(v)}
                  aria-pressed={theme === v}
                  className={`px-2.5 py-1 rounded text-sm capitalize transition-all ${
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
              <span className="text-sm text-destructive">Save failed — please try again.</span>
            )}
            {!isSaving && savedOk && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-3 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
