import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { BackupCodesStep } from "@features/auth/components/two-factor/backup-codes-step";
import { ConfigureTotpStep } from "@features/auth/components/two-factor/configure-totp-step";
import { TwoFactorManageSection } from "@features/auth/components/two-factor/manage-section";
import { TwoFactorPasswordStep } from "@features/auth/components/two-factor/password-step";
import { TwoFactorStatus } from "@features/auth/components/two-factor/status";
import { useTwoFactor } from "@features/auth/hooks/use-two-factor";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

export function TwoFactorSettingsPanel() {
  const {
    twoFactorEnabled,
    step,
    setStep,
    password,
    setPassword,
    verifyCode,
    setVerifyCode,
    backupCodes,
    loading,
    error,
    setError,
    qrDataUrl,
    secret,
    reset,
    handleEnable,
    handleVerifyTotp,
    handleDisable,
    handleRegenCodes,
  } = useTwoFactor();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 bg-muted/10">
          <SidebarTrigger className="-ml-1" />
          <span className="text-lg font-semibold">Two-Factor Authentication</span>
        </header>

        <main className="p-8 max-w-[720px] mx-auto w-full space-y-10">
          <div>
            <h2 className="text-base font-bold text-foreground">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add an extra layer of security to your account by requiring a verification code when
              signing in.
            </p>
          </div>

          <TwoFactorStatus enabled={twoFactorEnabled} />

          {!twoFactorEnabled && step === "idle" && (
            <section>
              <button
                type="button"
                onClick={() => {
                  setStep("enable-password");
                  setError("");
                }}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors shadow-sm"
              >
                <ShieldCheck className="size-4" />
                Enable Two-Factor Authentication
              </button>
            </section>
          )}

          {step === "enable-password" && (
            <TwoFactorPasswordStep
              title="Confirm your password"
              description="Enter your current password to begin the setup."
              submitLabel="Continue"
              password={password}
              onPasswordChange={setPassword}
              loading={loading}
              error={error}
              onSubmit={handleEnable}
              onCancel={reset}
            />
          )}

          {step === "configure-totp" && (
            <ConfigureTotpStep
              qrDataUrl={qrDataUrl}
              secret={secret}
              verifyCode={verifyCode}
              onVerifyCodeChange={setVerifyCode}
              loading={loading}
              error={error}
              onVerify={handleVerifyTotp}
              onCancel={reset}
              onCopy={copyToClipboard}
            />
          )}

          {step === "backup-codes" && backupCodes.length > 0 && (
            <BackupCodesStep backupCodes={backupCodes} onCopy={copyToClipboard} onDone={reset} />
          )}

          {twoFactorEnabled && step === "idle" && (
            <TwoFactorManageSection
              onRegenCodes={() => {
                setStep("regen-password");
                setError("");
              }}
              onDisable={() => {
                setStep("disable-password");
                setError("");
              }}
            />
          )}

          {step === "disable-password" && (
            <TwoFactorPasswordStep
              title="Disable two-factor authentication"
              description="Enter your password to disable 2FA. Your account will be less secure without it."
              submitLabel="Disable 2FA"
              submitVariant="destructive"
              password={password}
              onPasswordChange={setPassword}
              loading={loading}
              error={error}
              onSubmit={handleDisable}
              onCancel={reset}
            />
          )}

          {step === "regen-password" && (
            <TwoFactorPasswordStep
              title="Generate new backup codes"
              description="Enter your password to generate new backup codes. Your existing codes will be invalidated immediately."
              submitLabel="Generate codes"
              password={password}
              onPasswordChange={setPassword}
              loading={loading}
              error={error}
              onSubmit={handleRegenCodes}
              onCancel={reset}
            />
          )}

          <section className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-2 shadow-md">
            <p className="text-sm font-medium text-foreground">
              What is two-factor authentication?
            </p>
            <p className="text-sm text-muted-foreground">
              2FA adds a second verification step when you sign in. Even if someone obtains your
              password, they cannot access your account without your authenticator app or a backup
              code.
            </p>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
