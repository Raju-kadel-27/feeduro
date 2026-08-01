import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { CopyButton } from "./copy-button";
import { SectionHeading } from "./section-heading";
import { SettingsIdentityCodeExamples } from "./settings-identity-code-examples";
import { StepBadge } from "./step-badge";

type Board = { id: string; name: string; slug: string; isDefault: boolean };

type Props = {
  currentSecret: string;
  isSecretVisible: boolean;
  isRevealLoading: boolean;
  isRotating: boolean;
  confirmRotateSecret: boolean;
  setConfirmRotateSecret: (v: boolean) => void;
  onReveal: () => void;
  onHide: () => void;
  onRotateSecret: () => void;
  theme: "light" | "dark" | "auto";
  orgToken: string;
  boards: Board[];
  inlineBoardId: string;
  setInlineBoardId: (id: string) => void;
};

export function SettingsIdentitySection({
  currentSecret,
  isSecretVisible,
  isRevealLoading,
  isRotating,
  confirmRotateSecret,
  setConfirmRotateSecret,
  onReveal,
  onHide,
  onRotateSecret,
  theme,
  orgToken,
  boards,
  inlineBoardId,
  setInlineBoardId,
}: Props) {
  const displaySecret = isSecretVisible && currentSecret
    ? currentSecret
    : "•".repeat(32);

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-6">
      <SectionHeading
        title="Identity verification"
        description="Optionally tie feedback to your logged-in users. Without this, submissions are anonymous. With it, each post is stamped with the submitter's name and email."
      />

      {/* Step 1 */}
      <div className="space-y-3">
        <StepBadge n={1} label="Copy your signing secret — add it to your server's environment variables" />
        <div className="pl-7 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground/80 overflow-hidden">
              {isRevealLoading ? (
                <span className="text-muted-foreground text-sm">Loading…</span>
              ) : (
                displaySecret
              )}
            </div>
            <button
              type="button"
              onClick={isSecretVisible ? onHide : onReveal}
              disabled={isRevealLoading}
              className="shrink-0 flex items-center gap-1.5 px-2.5 h-9 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              aria-label={isSecretVisible ? "Hide" : "Reveal"}
            >
              {isSecretVisible ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {isSecretVisible ? "Hide" : "Reveal"}
            </button>
            <CopyButton text={currentSecret} disabled={!isSecretVisible || !currentSecret} />
          </div>
          <p className="text-sm text-muted-foreground">
            Keep this server-side only — exposing it lets anyone forge verified identities. Store it as{" "}
            <code className="bg-muted px-1 py-0.5 rounded">FEEDURO_SIGNING_SECRET</code> in your server environment.
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="space-y-3">
        <StepBadge n={2} label="On your server, hash the user's ID with the secret. Pass it to the embed." />
        <div className="pl-7">
          <SettingsIdentityCodeExamples
            theme={theme}
            orgToken={orgToken}
            boards={boards}
            inlineBoardId={inlineBoardId}
            setInlineBoardId={setInlineBoardId}
          />
        </div>
      </div>

      {/* Rotate secret */}
      <div className="flex items-center gap-3 pt-4 border-t border-border/60">
          <button
            type="button"
            onClick={onRotateSecret}
            disabled={isRotating}
            className={`flex items-center gap-2 px-3 h-8 rounded-md border text-sm font-medium transition-colors ${
              confirmRotateSecret
                ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {confirmRotateSecret ? "Confirm rotation" : "Rotate secret"}
          </button>
          {confirmRotateSecret ? (
            <button
              type="button"
              onClick={() => setConfirmRotateSecret(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Immediately invalidates all existing signatures.
            </p>
          )}
      </div>
    </section>
  );
}
