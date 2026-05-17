import { Dialog, DialogContent, DialogTitle } from "@components/ui/dialog";
import { Spinner } from "@components/ui/spinner";
import { GoogleIcon } from "@components/icons";
import { authClient } from "@lib/auth/client";
import { cn } from "@lib/utils";
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
      <DialogContent className="max-w-[420px] p-6">
        <DialogTitle className="sr-only">
          {tab === "sign-in" ? "Sign in to your account" : "Create an account"}
        </DialogTitle>

        <div className="flex items-center justify-between mb-5">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => switchTab("sign-in")}
              className={cn(
                "px-4 h-7 rounded-md text-[12.5px] font-medium transition-colors",
                tab === "sign-in"
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchTab("sign-up")}
              className={cn(
                "px-4 h-7 rounded-md text-[12.5px] font-medium transition-colors",
                tab === "sign-up"
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign up
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-9 rounded-md border border-border bg-background flex items-center justify-center gap-2 text-[13px] font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? <Spinner /> : <GoogleIcon />}
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or continue with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={tab === "sign-in" ? handleSignIn : handleSignUp} className="space-y-3">
          {tab === "sign-up" && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Full name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                autoComplete="name"
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "sign-up" ? "Min 8 characters" : "Your password"}
              required
              minLength={tab === "sign-up" ? 8 : undefined}
              autoComplete={tab === "sign-in" ? "current-password" : "new-password"}
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <p className="text-[12.5px] text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Spinner className="size-3.5" />}
            {tab === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
          {tab === "sign-in" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => switchTab("sign-up")}
                className="underline underline-offset-4 hover:text-foreground"
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
                className="underline underline-offset-4 hover:text-foreground"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
