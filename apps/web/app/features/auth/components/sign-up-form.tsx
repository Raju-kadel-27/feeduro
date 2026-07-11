import { GoogleIcon } from "@components/icons";
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
import { Link } from "react-router";

interface SignUpFormProps extends Omit<React.ComponentProps<"div">, "onSubmit"> {
  name: string;
  email: string;
  password: string;
  error: string;
  loadingMethod: "email" | "google" | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onGoogle: () => void;
}

export function SignUpForm({
  className,
  name,
  email,
  password,
  error,
  loadingMethod,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
  ...props
}: SignUpFormProps) {
  const busy = loadingMethod !== null;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">Start collecting feedback in minutes</p>
        </div>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <Button variant="outline" type="button" onClick={onGoogle} disabled={busy}>
                {loadingMethod === "google" ? <Spinner /> : <GoogleIcon />}
                Continue with Google
              </Button>
            </Field>

            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              Or continue with
            </FieldSeparator>

            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Jane Smith"
                required
                disabled={busy}
                autoComplete="name"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={busy}
                autoComplete="email"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                disabled={busy}
                autoComplete="new-password"
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
                {loadingMethod === "email" ? "Creating account…" : "Create account"}
              </Button>
              <FieldDescription className="text-center mt-3">
                Already have an account?{" "}
                <Link to="/sign-in" className="underline underline-offset-4 hover:text-primary">
                  Sign in
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </div>

      <FieldDescription className="px-6 text-center text-xs">
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
