import { AuthLeftPanel } from "@features/auth/components/auth-left-panel";
import { LoginForm } from "@features/auth/components/login-form";
import { authClient } from "@lib/auth/client";
import { getSession } from "@lib/session";
import { useState } from "react";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/sign-in";

export function meta() {
  return [{ title: "Sign In | Feeduro" }];
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
  const [loadingMethod, setLoadingMethod] = useState<"email" | "google" | "passkey" | "sso" | null>(null);
  const lastMethod = authClient.getLastUsedLoginMethod();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingMethod("email");
    setError("");
    await authClient.signIn.email({
      email,
      password,
      callbackURL: redirectTo,
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Invalid email or password");
          setLoadingMethod(null);
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
    setLoadingMethod("google");
    setError("");
    const { error: oauthError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });
    if (oauthError) {
      setError(oauthError.message ?? "Google sign-in failed. Please try again.");
      setLoadingMethod(null);
    }
  }

  async function handleSSO() {
    if (!email) {
      setError("Enter your work email first, then click Sign in with SSO.");
      return;
    }
    setLoadingMethod("sso");
    setError("");
    const { error: ssoError } = await authClient.signIn.sso({
      email,
      callbackURL: redirectTo,
    });
    if (ssoError) {
      setError(ssoError.message ?? "No SSO provider found for this email domain.");
      setLoadingMethod(null);
    }
  }

  async function handlePasskey() {
    setLoadingMethod("passkey");
    setError("");
    await authClient.signIn.passkey({
      fetchOptions: {
        onSuccess() {
          window.location.href = redirectTo;
        },
        onError(ctx) {
          setError(ctx.error.message ?? "Passkey sign-in failed. Please try again.");
          setLoadingMethod(null);
        },
      },
    });
  }


  return (
    <div className="flex h-svh">
      <AuthLeftPanel />

      {/* Right panel */}
      <div className="flex flex-1 flex-col bg-background relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
          }}
        />
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <LoginForm
              email={email}
              password={password}
              error={error}
              loadingMethod={loadingMethod}
              lastMethod={lastMethod}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleSubmit}
              onGoogle={handleGoogle}
              onPasskey={handlePasskey}
              onSSO={handleSSO}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
