import { Button } from "@components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@components/ui/field";
import { Input } from "@components/ui/input";
import { Spinner } from "@components/ui/spinner";
import { authClient } from "@lib/auth/client";
import { GalleryVerticalEnd } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export function meta() {
  return [{ title: "Forgot Password — Feeduro" }];
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
      fetchOptions: {
        onSuccess() {
          setSent(true);
          setLoading(false);
        },
        onError(ctx) {
          setError(ctx.error.message ?? "Something went wrong. Please try again.");
          setLoading(false);
        },
      },
    });
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
            <CardTitle className="text-xl">Forgot your password?</CardTitle>
            <CardDescription>
              {sent
                ? "Check your inbox for a reset link."
                : "Enter your email and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-center text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, you'll receive an email shortly.{" "}
                <Link to="/sign-in" className="underline underline-offset-4 hover:text-primary">
                  Back to sign in
                </Link>
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="m@example.com"
                      required
                      disabled={loading}
                      autoComplete="email"
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
                      {loading ? "Sending…" : "Send reset link"}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      <Link
                        to="/sign-in"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Back to sign in
                      </Link>
                    </p>
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
