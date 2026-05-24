import { CheckCircle2, Copy } from "lucide-react";

type Props = {
  backupCodes: string[];
  onCopy: (text: string, label: string) => void;
  onDone: () => void;
};

export function BackupCodesStep({ backupCodes, onCopy, onDone }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="size-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Save your backup codes</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Store these codes somewhere safe. Each code can only be used once to regain access if
            you lose your authenticator app.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-4">
        {backupCodes.map((code) => (
          <code key={code} className="text-sm font-mono text-foreground tracking-wider">
            {code}
          </code>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onCopy(backupCodes.join("\n"), "Backup codes")}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          <Copy className="size-4" />
          Copy all codes
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>
    </section>
  );
}
