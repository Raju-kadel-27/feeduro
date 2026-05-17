import { ShieldCheck, ShieldOff } from "lucide-react";

type Props = { enabled: boolean };

export function TwoFactorStatus({ enabled }: Props) {
  return (
    <section>
      <div className="flex items-center gap-3 rounded-lg border border-border p-4 bg-card shadow-sm">
        {enabled ? (
          <>
            <ShieldCheck className="size-5 text-green-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">2FA is enabled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your account is protected with two-factor authentication.
              </p>
            </div>
            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">
              Active
            </span>
          </>
        ) : (
          <>
            <ShieldOff className="size-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">2FA is not enabled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable 2FA to add an extra layer of security to your account.
              </p>
            </div>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              Inactive
            </span>
          </>
        )}
      </div>
    </section>
  );
}
