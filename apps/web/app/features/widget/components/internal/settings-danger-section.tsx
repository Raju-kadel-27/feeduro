import { RefreshCw } from "lucide-react";

type Props = {
  confirmRegen: boolean;
  setConfirmRegen: (v: boolean) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
};

export function SettingsDangerSection({
  confirmRegen,
  setConfirmRegen,
  onRegenerate,
  isRegenerating,
}: Props) {
  return (
    <section className="rounded-xl border border-destructive/25 bg-destructive/[0.02] p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Regenerating the widget token will break all existing embed snippets immediately. You'll
          need to redeploy the new snippet to every site.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className={`flex items-center gap-2 px-3 h-8 rounded-md border text-sm font-medium transition-colors ${
            confirmRegen
              ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {confirmRegen ? "Confirm regenerate" : "Regenerate token"}
        </button>
        {confirmRegen && (
          <button
            type="button"
            onClick={() => setConfirmRegen(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
