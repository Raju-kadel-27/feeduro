import { Button } from "@components/ui/button";
import { authClient } from "@lib/auth/client";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Current password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
          autoComplete="new-password"
          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
          autoComplete="new-password"
          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <XCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
          <CheckCircle2 size={14} className="shrink-0" />
          Password updated successfully.
        </div>
      )}

      <div className="pt-1">
        <Button type="submit" disabled={loading} size="sm">
          {loading ? "Saving…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
