type Props = {
  onRegenCodes: () => void;
  onDisable: () => void;
};

export function TwoFactorManageSection({ onRegenCodes, onDisable }: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Manage 2FA</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRegenCodes}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors shadow-sm"
        >
          Generate new backup codes
        </button>
        <button
          type="button"
          onClick={onDisable}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors shadow-sm"
        >
          Disable 2FA
        </button>
      </div>
    </section>
  );
}
