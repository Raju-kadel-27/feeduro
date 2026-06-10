import { Button } from "@components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@components/ui/field";
import { Input } from "@components/ui/input";
import { Spinner } from "@components/ui/spinner";
import { authClient } from "@lib/auth/client";
import { GalleryVerticalEnd } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

export function meta() {
  return [{ title: "Reset Password — Feeduro" }];
}

export default function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "INVALID_TOKEN") {
      setError("This reset link is invalid or has expired.");
    } else {
      setToken(params.get("token"));
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }
    setLoading(true);
    setError("");
    await authClient.resetPassword({
      newPassword,
      token,
      fetchOptions: {
        onSuccess() {
          setDone(true);
          setLoading(false);
        },
        onError(ctx) {
          setError(ctx.error.message ?? "Failed to reset password. Please try again.");
          setLoading(false);
        },
      },
    });
  }

  const invalidToken = !token && !!error;

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
            <CardTitle className="text-xl">
              {done ? "Password updated" : "Choose a new password"}
            </CardTitle>
            <CardDescription>
              {done
                ? "Your password has been reset successfully."
                : "Enter a new password for your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/sign-in" className="underline underline-offset-4 hover:text-primary">
                  Sign in with your new password
                </Link>
              </p>
            ) : invalidToken ? (
              <p className="text-center text-sm text-destructive">
                {error}{" "}
                <Link
                  to="/forgot-password"
                  className="underline underline-offset-4 hover:text-primary text-foreground"
                >
                  Request a new link
                </Link>
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </Field>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {error}
                    </p>
                  )}

                  <Field>
                    <Button type="submit" disabled={loading}>
                      {loading && <Spinner />}
                      {loading ? "Updating…" : "Update password"}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
