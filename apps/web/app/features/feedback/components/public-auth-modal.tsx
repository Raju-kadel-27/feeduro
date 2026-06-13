import { GoogleIcon } from "@components/icons";
import { Button } from "@components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@components/ui/field";
import { Input } from "@components/ui/input";
import { Spinner } from "@components/ui/spinner";
import { authClient } from "@lib/auth/client";
import { useState } from "react";
import type { AuthTab } from "../schemas/public";

export function PublicAuthModal({
  initialTab = "sign-in",
  onClose,
  onSuccess,
}: {
  initialTab?: AuthTab;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  }

  function switchTab(t: AuthTab) {
    reset();
    setTab(t);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await authClient.signIn.email({
      email,
      password,
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Invalid email or password");
          setLoading(false);
        },
        onSuccess() {
          onSuccess();
        },
      },
    });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await authClient.signUp.email({
      name,
      email,
      password,
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Could not create account");
          setLoading(false);
        },
        onSuccess() {
          onSuccess();
        },
      },
    });
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const callbackURL = window.location.href;
    const { error: oauthError } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (oauthError) {
      setError(oauthError.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[420px] p-0 gap-0 rounded-2xl overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">
          {tab === "sign-in" ? "Sign in to your account" : "Create an account"}
        </DialogTitle>

        <CardHeader className="text-center pb-2 pt-8">
          <CardTitle className="text-xl">
            {tab === "sign-in" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {tab === "sign-in"
              ? "Sign in to vote and leave feedback"
              : "Join to vote and leave feedback"}
          </CardDescription>
        </CardHeader>

        <div className="px-6 pb-6 pt-4">
          <form onSubmit={tab === "sign-in" ? handleSignIn : handleSignUp}>
            <FieldGroup>
              <Field>
                <Button variant="outline" type="button" onClick={handleGoogle} disabled={loading}>
                  {loading ? <Spinner /> : <GoogleIcon />}
                  Continue with Google
                </Button>
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-background">
                Or continue with
              </FieldSeparator>

              {tab === "sign-up" && (
                <Field>
                  <FieldLabel htmlFor="public-auth-name">Full name</FieldLabel>
                  <Input
                    id="public-auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    autoComplete="name"
                    disabled={loading}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="public-auth-email">Email</FieldLabel>
                <Input
                  id="public-auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="public-auth-password">Password</FieldLabel>
                  {tab === "sign-in" && (
                    <a
                      href="/forgot-password"
                      className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>
                <Input
                  id="public-auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "sign-up" ? "Min 8 characters" : "Your password"}
                  required
                  minLength={tab === "sign-up" ? 8 : undefined}
                  autoComplete={tab === "sign-in" ? "current-password" : "new-password"}
                  disabled={loading}
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
                  {tab === "sign-in"
                    ? loading ? "Signing in…" : "Sign in"
                    : loading ? "Creating account…" : "Create account"}
                </Button>
                <FieldDescription className="text-center">
                  {tab === "sign-in" ? (
                    <>
                      No account?{" "}
                      <button
                        type="button"
                        onClick={() => switchTab("sign-up")}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchTab("sign-in")}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
