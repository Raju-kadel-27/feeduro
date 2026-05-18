import { GoogleIcon } from "@components/icons";
import { Badge } from "@components/ui/badge";
import { Spinner } from "@components/ui/spinner";
import { Button } from "@components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@components/ui/field";
import { Input } from "@components/ui/input";
import { cn } from "@lib/utils";
import { Fingerprint } from "lucide-react";
import { Link } from "react-router";

interface LoginFormProps extends Omit<React.ComponentProps<"div">, "onSubmit"> {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  lastMethod?: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onGoogle: () => void;
  onPasskey: () => void;
}

export function LoginForm({
  className,
  email,
  password,
  error,
  loading,
  lastMethod,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
  onPasskey,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <Button variant="outline" type="button" onClick={onGoogle} disabled={loading}>
                  {loading ? <Spinner /> : <GoogleIcon />}
                  Login with Google
                  {lastMethod === "google" && (
                    <Badge variant="secondary" className="ml-auto">Last used</Badge>
                  )}
                </Button>
              </Field>

              <Field>
                <Button variant="outline" type="button" onClick={onPasskey} disabled={loading}>
                  <Fingerprint className="size-4" />
                  Sign in with Passkey
                  {lastMethod === "passkey" && (
                    <Badge variant="secondary" className="ml-auto">Last used</Badge>
                  )}
                </Button>
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>

              <Field>
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  {lastMethod === "email" && (
                    <Badge variant="secondary" className="text-xs">Last used</Badge>
                  )}
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="m@example.com"
                  required
                  disabled={loading}
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
                  disabled={loading}
                  autoComplete="current-password webauthn"
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
                  {loading ? "Signing in…" : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link to="/sign-up" className="underline underline-offset-4 hover:text-primary">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}
