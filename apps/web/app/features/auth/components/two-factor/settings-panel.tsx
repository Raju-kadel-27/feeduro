import { PageHeader } from "@components/common/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { SidebarTrigger } from "@components/ui/sidebar";
import { BackupCodesStep } from "@features/auth/components/two-factor/backup-codes-step";
import { ConfigureTotpStep } from "@features/auth/components/two-factor/configure-totp-step";
import { TwoFactorManageSection } from "@features/auth/components/two-factor/manage-section";
import { TwoFactorPasswordStep } from "@features/auth/components/two-factor/password-step";
import { TwoFactorStatus } from "@features/auth/components/two-factor/status";
import { useTwoFactor } from "@features/auth/hooks/use-two-factor";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

const ENABLE_STEPS = ["enable-password", "configure-totp", "backup-codes"] as const;

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

  const [showEnableDialog, setShowEnableDialog] = useState(false);

  function openEnableDialog() {
    setStep("enable-password");
    setError("");
    setShowEnableDialog(true);
  }

  function closeEnableDialog() {
    reset();
    setShowEnableDialog(false);
  }

  const enableDialogOpen = showEnableDialog || ENABLE_STEPS.includes(step as typeof ENABLE_STEPS[number]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Two-Factor Authentication"
          icon={ShieldCheck}
          description="Add an extra layer of security to your account by requiring a verification code when signing in."
          action={
            !twoFactorEnabled ? (
              <button
                type="button"
                onClick={openEnableDialog}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap shrink-0"
              >
                Enable
              </button>
            ) : undefined
          }
        />

        <TwoFactorStatus enabled={twoFactorEnabled} />

        {twoFactorEnabled && step === "idle" && (
          <TwoFactorManageSection
            onRegenCodes={() => { setStep("regen-password"); setError(""); }}
            onDisable={() => { setStep("disable-password"); setError(""); }}
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

        <section className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-2">
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

      <Dialog open={enableDialogOpen} onOpenChange={(v) => { if (!v) closeEnableDialog(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Two Factor Auth</DialogTitle>
          </DialogHeader>
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
              onCancel={closeEnableDialog}
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
              onCancel={closeEnableDialog}
              onCopy={copyToClipboard}
            />
          )}
          {step === "backup-codes" && backupCodes.length > 0 && (
            <BackupCodesStep
              backupCodes={backupCodes}
              onCopy={copyToClipboard}
              onDone={closeEnableDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
