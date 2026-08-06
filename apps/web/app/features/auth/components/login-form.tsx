import { GoogleIcon } from "@components/icons";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@components/ui/field";
import { Input } from "@components/ui/input";
import { Spinner } from "@components/ui/spinner";
import { cn } from "@lib/utils";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { Link } from "react-router";

interface LoginFormProps extends Omit<React.ComponentProps<"div">, "onSubmit"> {
  email: string;
  password: string;
  error: string;
  loadingMethod: "email" | "google" | "passkey" | "sso" | null;
  lastMethod?: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onGoogle: () => void;
  onPasskey: () => void;
  onSSO: () => void;
}

export function LoginForm({
  className,
  email,
  password,
  error,
  loadingMethod,
  lastMethod,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
  onPasskey,
  onSSO,
  ...props
}: LoginFormProps) {
  const busy = loadingMethod !== null;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Welcome back</h2>
        </div>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <Button variant="outline" type="button" onClick={onGoogle} disabled={busy} className="relative">
                {loadingMethod === "google" ? <Spinner /> : <GoogleIcon />}
                Login with Google
                {lastMethod === "google" && (
                  <Badge variant="secondary" className="absolute right-3 bg-yellow-100 text-yellow-700 border-yellow-200">
                    Last used
                  </Badge>
                )}
              </Button>
            </Field>

            <Field>
              <Button variant="outline" type="button" onClick={onPasskey} disabled={busy} className="relative">
                {loadingMethod === "passkey" ? <Spinner /> : <Fingerprint className="size-4" />}
                Sign in with Passkey
                {lastMethod === "passkey" && (
                  <Badge variant="secondary" className="absolute right-3 bg-yellow-100 text-yellow-700 border-yellow-200">
                    Last used
                  </Badge>
                )}
              </Button>
            </Field>

            <Field>
              <Button variant="outline" type="button" onClick={onSSO} disabled={busy}>
                {loadingMethod === "sso" ? <Spinner /> : <ShieldCheck className="size-4" />}
                Sign in with SSO
              </Button>
            </Field>

            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              Or continue with
            </FieldSeparator>

            <Field>
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                {lastMethod === "email" && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                    Last used
                  </Badge>
                )}
              </div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="m@example.com"
                required
                disabled={busy}
                autoComplete="email webauthn"
              />
            </Field>

            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  to="/forgot-password"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                required
                disabled={busy}
                autoComplete="current-password webauthn"
              />
            </Field>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <Field>
              <Button type="submit" disabled={busy}>
                {loadingMethod === "email" && <Spinner />}
                {loadingMethod === "email" ? "Signing in…" : "Login"}
              </Button>
              <FieldDescription className="text-center mt-3">
                Don&apos;t have an account?{" "}
                <Link to="/sign-up" className="underline underline-offset-4 hover:text-primary">
                  Sign up
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </div>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}
