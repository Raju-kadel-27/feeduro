import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { CopyButton } from "./copy-button";
import { SectionHeading } from "./section-heading";
import { SettingsIdentityCodeExamples } from "./settings-identity-code-examples";
import { StepBadge } from "./step-badge";

type Board = { id: string; name: string; isDefault: boolean; embedToken: string };

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
  orgSlug: string;
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
  orgSlug,
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
        description="Tie feedback submissions to your logged-in users with a server-generated HMAC signature. Without it, anyone could spoof a user ID."
      />

      {/* Step 1 */}
      <div className="space-y-3">
        <StepBadge n={1} label="Copy your signing secret and store it as an environment variable" />
        <div className="pl-7 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground/80 overflow-hidden">
              {isRevealLoading ? (
                <span className="text-muted-foreground text-xs">Loading…</span>
              ) : (
                displaySecret
              )}
            </div>
            <button
              type="button"
              onClick={isSecretVisible ? onHide : onReveal}
              disabled={isRevealLoading}
              className="shrink-0 flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
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
          <p className="text-xs text-muted-foreground">
            Never put this in client-side code. Set it as{" "}
            <code className="bg-muted px-1 py-0.5 rounded">FEEDURO_SIGNING_SECRET</code> on your
            server.
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="space-y-3">
        <StepBadge n={2} label="Generate the signature server-side and pass it to the embed" />
        <div className="pl-7">
          <SettingsIdentityCodeExamples
            theme={theme}
            orgSlug={orgSlug}
            boards={boards}
            inlineBoardId={inlineBoardId}
            setInlineBoardId={setInlineBoardId}
          />
        </div>
      </div>

      {/* Rotate secret */}
      <div className="flex items-center gap-3 pt-1 border-t border-border/60">
        <div className="flex items-center gap-3 pt-4">
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
            <p className="text-xs text-muted-foreground">
              Immediately invalidates all existing signatures.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
