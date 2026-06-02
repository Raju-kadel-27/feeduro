import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { authClient } from "@lib/auth/client";
import { changePasswordSchema } from "../schemas/password";
import { PasswordField } from "./password-field";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { Button } from "@components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

import type { ChangePasswordValues } from "../schemas/password";

export function ChangePasswordForm() {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
  });

  const newPassword = watch("newPassword", "");

  async function onSubmit(values: ChangePasswordValues) {
    setServerError("");
    setSuccess(false);
    await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
      fetchOptions: {
        onSuccess() {
          setSuccess(true);
          reset();
        },
        onError(ctx) {
          setServerError(ctx.error.message ?? "Failed to update password.");
        },
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <PasswordField
        label="Current password"
        registration={register("currentPassword")}
        error={errors.currentPassword?.message}
      />
      <div className="space-y-2">
        <PasswordField
          label="New password"
          registration={register("newPassword")}
          error={errors.newPassword?.message}
        />
        <PasswordStrengthMeter password={newPassword} />
      </div>
      <PasswordField
        label="Confirm new password"
        registration={register("confirmPassword")}
        error={errors.confirmPassword?.message}
      />
      {serverError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <XCircle size={14} className="shrink-0" />
          {serverError}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
          <CheckCircle2 size={14} className="shrink-0" />
          Password updated successfully.
        </div>
      )}
      <div className="pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
