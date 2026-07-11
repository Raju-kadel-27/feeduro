import { AuthLeftPanel } from "@features/auth/components/auth-left-panel";
import { SignUpForm } from "@features/auth/components/sign-up-form";
import { authClient } from "@lib/auth/client";
import { getSession } from "@lib/session";
import { useState } from "react";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/sign-up";

export function meta() {
  return [{ title: "Sign Up — Feeduro" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  try {
    const session = await getSession(db, request);
    if (session) {
      const orgId = session.session.activeOrganizationId;
      throw new Response(null, {
        status: 302,
        headers: { Location: orgId ? "/dashboard" : "/onboarding" },
      });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
  }
  return null;
}

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingMethod, setLoadingMethod] = useState<"email" | "google" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingMethod("email");
    setError("");
    await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/onboarding",
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Could not create account");
          setLoadingMethod(null);
        },
      },
    });
  }

  async function handleGoogle() {
    setLoadingMethod("google");
    setError("");
    const { error: oauthError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/onboarding",
    });
    if (oauthError) {
      setError(oauthError.message ?? "Google sign-in failed. Please try again.");
      setLoadingMethod(null);
    }
  }

  return (
    <div className="flex h-svh">
      <AuthLeftPanel
        imageUrl="https://plus.unsplash.com/premium_photo-1738894549244-cb88c55f7784?q=90&w=1400&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        quote="Setup took less than an hour. Within a week we had real user feedback shaping our entire roadmap. I wish we had done this sooner."
        author="Priya Mehta, CTO at Launchpad"
      />

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
            <SignUpForm
              name={name}
              email={email}
              password={password}
              error={error}
              loadingMethod={loadingMethod}
              onNameChange={setName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleSubmit}
              onGoogle={handleGoogle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
