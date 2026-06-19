import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { cn } from "@lib/utils";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  appName: string;
  activeTokens: number;
  rotating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RotateConfirmDialog({
  open,
  appName,
  activeTokens,
  rotating,
  onConfirm,
  onCancel,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const confirmed = inputValue.trim() === appName.trim();

  useEffect(() => {
    if (!open) setInputValue("");
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) onCancel();
  }

  function handleConfirm() {
    if (!confirmed || rotating) return;
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] gap-0 p-0 overflow-hidden">
        {/* Header strip */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 mt-0.5">
            <RefreshCw size={16} className="text-amber-500" />
          </div>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base font-semibold leading-snug">
              Rotate client secret?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              The current secret is <strong className="font-medium text-foreground">immediately invalidated</strong>. Any integration still using it will break until updated with the new secret.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Active tokens warning */}
          {activeTokens > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[13px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>{activeTokens} active token{activeTokens !== 1 ? "s" : ""}</strong> will be
                invalidated. Affected users will need to re-authorize.
              </p>
            </div>
          )}

          {/* Confirmation input */}
          <div className="space-y-2">
            <label
              htmlFor="rotate-confirm-input"
              className="text-sm text-muted-foreground leading-relaxed block"
            >
              Type{" "}
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                {appName}
              </code>{" "}
              to confirm
            </label>
            <div className="relative">
              <Input
                id="rotate-confirm-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                placeholder={appName}
                autoComplete="off"
                spellCheck={false}
                // biome-ignore lint/a11y/noAutofocus: intentional — user must type to confirm destructive action
                autoFocus
                className={cn(
                  "pr-8 transition-colors",
                  confirmed && "border-emerald-500/50 focus-visible:ring-emerald-500/20",
                )}
              />
              {confirmed && (
                <CheckCircle2
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!confirmed || rotating}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                confirmed && !rotating
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
              )}
            >
              <RefreshCw size={13} className={rotating ? "animate-spin" : ""} />
              {rotating ? "Rotating…" : "Rotate secret"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
