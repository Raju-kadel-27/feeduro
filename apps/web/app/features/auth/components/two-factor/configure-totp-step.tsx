import { Spinner } from "@components/ui/spinner";
import { Copy } from "lucide-react";

type Props = {
  qrDataUrl: string;
  secret: string;
  verifyCode: string;
  onVerifyCodeChange: (value: string) => void;
  loading: boolean;
  error: string;
  onVerify: () => void;
  onCancel: () => void;
  onCopy: (text: string, label: string) => void;
};

export function ConfigureTotpStep({
  qrDataUrl,
  secret,
  verifyCode,
  onVerifyCodeChange,
  loading,
  error,
  onVerify,
  onCancel,
  onCopy,
}: Props) {
  return (
    <section className="space-y-6 rounded-lg border border-border p-6 bg-card shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Set up authenticator app</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Scan the QR code with your authenticator app, or enter the secret key manually. Then enter
          the 6-digit code to verify.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Scan with authenticator app
        </p>
        {qrDataUrl ? (
          <div className="inline-block rounded-lg border border-border bg-white dark:bg-white p-3">
            <img src={qrDataUrl} alt="TOTP QR code" width={200} height={200} />
          </div>
        ) : (
          <div className="flex size-[224px] items-center justify-center rounded-lg border border-border bg-muted">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Use Google Authenticator, Authy, or any TOTP-compatible app to scan the code above.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Or enter the secret key manually
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono tracking-widest break-all">
            {secret}
          </code>
          <button
            type="button"
            onClick={() => onCopy(secret, "Secret key")}
            className="p-2 rounded-md border border-border hover:bg-accent transition-colors shrink-0"
            title="Copy secret key"
          >
            <Copy className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-sm font-medium text-foreground">Verification code</p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={verifyCode}
          onChange={(e) => onVerifyCodeChange(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          disabled={loading}
          autoComplete="one-time-code"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center tracking-widest ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onVerify}
            disabled={loading || verifyCode.length !== 6}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading && <Spinner />}
            Verify & Enable
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
