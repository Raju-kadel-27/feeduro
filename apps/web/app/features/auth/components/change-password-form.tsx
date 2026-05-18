import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { authClient } from "@lib/auth/client";
import { useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);
    await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
      fetchOptions: {
        onSuccess() {
          setSuccess(true);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setLoading(false);
        },
        onError(ctx) {
          setError(ctx.error.message ?? "Failed to update password.");
          setLoading(false);
        },
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Current password
        </label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
          className="mt-1 text-[13px]"
        />
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          New password
        </label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
          autoComplete="new-password"
          className="mt-1 text-[13px]"
        />
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Confirm new password
        </label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
          autoComplete="new-password"
          className="mt-1 text-[13px]"
        />
      </div>

      {error && (
        <p className="text-[12px] text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
      {success && (
        <p className="text-[12px] text-green-600 bg-green-50 px-3 py-2 rounded-md">
          Password updated successfully.
        </p>
      )}

      <Button type="submit" disabled={loading} size="sm" className="mt-1">
        {loading ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
