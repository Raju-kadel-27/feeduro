import { authClient } from "@lib/auth/client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type Step =
  | "idle"
  | "enable-password"
  | "configure-totp"
  | "backup-codes"
  | "disable-password"
  | "regen-password";

function extractSecret(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function useTwoFactor() {
  const { data: session, refetch } = authClient.useSession();
  const twoFactorEnabled =
    (session?.user as { twoFactorEnabled?: boolean })?.twoFactorEnabled === true;

  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!totpURI) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(totpURI, { width: 200, margin: 2 }).then(setQrDataUrl);
  }, [totpURI]);

  function reset() {
    setStep("idle");
    setPassword("");
    setVerifyCode("");
    setTotpURI("");
    setQrDataUrl("");
    setBackupCodes([]);
    setError("");
  }

  async function handleEnable() {
    setLoading(true);
    setError("");
    const { data, error: enableError } = await authClient.twoFactor.enable({ password });
    if (enableError) {
      setError(enableError.message ?? "Failed to enable 2FA. Check your password.");
      setLoading(false);
      return;
    }
    setTotpURI(data?.totpURI ?? "");
    setBackupCodes(data?.backupCodes ?? []);
    setPassword("");
    setStep("configure-totp");
    setLoading(false);
  }

  async function handleVerifyTotp() {
    setLoading(true);
    setError("");
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code: verifyCode });
    if (verifyError) {
      setError(verifyError.message ?? "Invalid code. Please try again.");
      setLoading(false);
      return;
    }
    await refetch();
    setStep("backup-codes");
    setLoading(false);
    toast.success("Two-factor authentication enabled");
  }

  async function handleDisable() {
    setLoading(true);
    setError("");
    const { error: disableError } = await authClient.twoFactor.disable({ password });
    if (disableError) {
      setError(disableError.message ?? "Failed to disable 2FA. Check your password.");
      setLoading(false);
      return;
    }
    await refetch();
    reset();
    toast.success("Two-factor authentication disabled");
  }

  async function handleRegenCodes() {
    setLoading(true);
    setError("");
    const { data, error: regenError } = await authClient.twoFactor.generateBackupCodes({
      password,
    });
    if (regenError) {
      setError(regenError.message ?? "Failed to generate backup codes. Check your password.");
      setLoading(false);
      return;
    }
    setBackupCodes(data?.backupCodes ?? []);
    setPassword("");
    setStep("backup-codes");
    setLoading(false);
    toast.success("New backup codes generated");
  }

  return {
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
    secret: totpURI ? extractSecret(totpURI) : "",
    reset,
    handleEnable,
    handleVerifyTotp,
    handleDisable,
    handleRegenCodes,
  };
}
