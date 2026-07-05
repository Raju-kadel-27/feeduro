import { LoginForm } from "@features/auth/components/login-form";
import { authClient } from "@lib/auth/client";
import { getSession } from "@lib/session";
import { GalleryVerticalEnd } from "lucide-react";
import { useEffect, useState } from "react";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/sign-in";

export function meta() {
  return [{ title: "Sign In — Feeduro" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  try {
    const session = await getSession(db, request);
    if (session) {
      const orgId = session.session.activeOrganizationId;
      throw new Response(null, {
        status: 302,
        headers: { Location: orgId ? "/" : "/onboarding" },
      });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
  }
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") ?? "/";
  return { redirectTo };
}

export default function SignIn({ loaderData }: Route.ComponentProps) {
  const { redirectTo } = loaderData;

  const [email, setEmail] = useState(import.meta.env.DEV ? "johndoe@gmail.com" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "password" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const lastMethod = authClient.getLastUsedLoginMethod();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await authClient.signIn.email({
      email,
      password,
      callbackURL: redirectTo,
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Invalid email or password");
          setLoading(false);
        },
        onSuccess(ctx) {
          if (ctx.data?.twoFactorRedirect) {
            window.location.href = `/two-factor?redirect=${encodeURIComponent(redirectTo)}`;
          }
        },
      },
    });
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const { error: oauthError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });
    if (oauthError) {
      setError(oauthError.message ?? "Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  async function handlePasskey() {
    setLoading(true);
    setError("");
    await authClient.signIn.passkey({
      fetchOptions: {
        onSuccess() {
          window.location.href = redirectTo;
        },
        onError(ctx) {
          setError(ctx.error.message ?? "Passkey sign-in failed. Please try again.");
          setLoading(false);
        },
      },
    });
  }

  useEffect(() => {
    if (
      !window.PublicKeyCredential ||
      !PublicKeyCredential.isConditionalMediationAvailable ||
      !PublicKeyCredential.isConditionalMediationAvailable()
    ) {
      return;
    }
    void authClient.signIn.passkey({ autoFill: true });
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Feeduro
        </a>

        <LoginForm
          email={email}
          password={password}
          error={error}
          loading={loading}
          lastMethod={lastMethod}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onGoogle={handleGoogle}
          onPasskey={handlePasskey}
        />
      </div>
    </div>
  );
}
