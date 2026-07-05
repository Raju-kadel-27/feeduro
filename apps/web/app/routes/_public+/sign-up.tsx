import { SignUpForm } from "@features/auth/components/sign-up-form";
import { authClient } from "@lib/auth/client";
import { getSession } from "@lib/session";
import { GalleryVerticalEnd } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/onboarding",
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Could not create account");
          setLoading(false);
        },
      },
    });
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const { error: oauthError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/onboarding",
    });
    if (oauthError) {
      setError(oauthError.message ?? "Google sign-in failed. Please try again.");
      setLoading(false);
    }
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

        <SignUpForm
          name={name}
          email={email}
          password={password}
          error={error}
          loading={loading}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onGoogle={handleGoogle}
        />

        <p className="text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <Link
            to="/terms"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
