import { AlertCircle } from "lucide-react";
import { CopyButton } from "./copy-button";

interface NewCredentials {
  clientId: string;
  clientSecret: string | null;
  name: string;
}

export function NewCredentialsReveal({
  credentials,
  onDismiss,
}: {
  credentials: NewCredentials;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
      <div className="flex items-center gap-3 text-amber-600">
        <AlertCircle size={16} />
        <span className="text-sm font-semibold">
          Save your credentials — the client secret won&apos;t be shown again
        </span>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Client ID</div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <code className="text-sm font-mono flex-1 break-all">{credentials.clientId}</code>
          <CopyButton value={credentials.clientId} label="client ID" />
        </div>
      </div>
      {credentials.clientSecret && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Client Secret</div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <code className="text-sm font-mono flex-1 break-all">{credentials.clientSecret}</code>
            <CopyButton value={credentials.clientSecret} label="client secret" />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        I&apos;ve saved my credentials
      </button>
    </div>
  );
}

export function RotatedSecretReveal({
  secret,
  onDismiss,
}: {
  secret: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
      <div className="flex items-center gap-3 text-amber-600">
        <AlertCircle size={16} />
        <span className="text-sm font-semibold">New client secret — won&apos;t be shown again</span>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <code className="text-sm font-mono flex-1 break-all">{secret}</code>
        <CopyButton value={secret} label="rotated secret" />
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        I&apos;ve saved the secret
      </button>
    </div>
  );
}
