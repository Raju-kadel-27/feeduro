import { Button } from "@components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Spinner } from "@components/ui/spinner";
import { authClient } from "@lib/auth/client";
import { GalleryVerticalEnd, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

export function meta() {
  return [{ title: "Two-Factor Verification | Feeduro" }];
}

type Method = "totp" | "backup";

export default function TwoFactor() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [method, setMethod] = useState<Method>("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (method === "totp") {
      const { error: verifyError } = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice,
      });
      if (verifyError) {
        setError(verifyError.message ?? "Invalid code. Please try again.");
        setLoading(false);
      } else {
        window.location.href = redirectTo;
      }
    } else {
      const { error: verifyError } = await authClient.twoFactor.verifyBackupCode({
        code,
        trustDevice,
      });
      if (verifyError) {
        setError(verifyError.message ?? "Invalid backup code. Please try again.");
        setLoading(false);
      } else {
        window.location.href = redirectTo;
      }
    }
  }

  function switchMethod() {
    setMethod((m) => (m === "totp" ? "backup" : "totp"));
    setCode("");
    setError("");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Feeduro
        </a>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Two-Factor Verification</CardTitle>
            <CardDescription>
              {method === "totp"
                ? "Enter the 6-digit code from your authenticator app."
                : "Enter one of your backup recovery codes."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <Input
                type="text"
                inputMode={method === "totp" ? "numeric" : "text"}
                pattern={method === "totp" ? "[0-9]{6}" : undefined}
                maxLength={method === "totp" ? 6 : undefined}
                placeholder={method === "totp" ? "000000" : "xxxxxxxxxx"}
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                required
                autoFocus
                autoComplete="one-time-code"
                disabled={loading}
                className="text-center text-lg tracking-widest"
              />

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  disabled={loading}
                  className="rounded border-border"
                />
                Trust this device for 30 days
              </label>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading || code.length === 0}>
                {loading && <Spinner />}
                {loading ? "Verifying…" : "Verify"}
              </Button>

              <button
                type="button"
                onClick={switchMethod}
                className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {method === "totp" ? "Use a backup code instead" : "Use authenticator app instead"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
