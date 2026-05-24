import { Spinner } from "@components/ui/spinner";

type Variant = "primary" | "destructive";

type Props = {
  title: string;
  description: string;
  submitLabel: string;
  submitVariant?: Variant;
  password: string;
  onPasswordChange: (value: string) => void;
  loading: boolean;
  error: string;
  onSubmit: () => void;
  onCancel: () => void;
};

const submitStyles: Record<Variant, string> = {
  primary:
    "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50",
  destructive:
    "inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50",
};

export function TwoFactorPasswordStep({
  title,
  description,
  submitLabel,
  submitVariant = "primary",
  password,
  onPasswordChange,
  loading,
  error,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        placeholder="Your password"
        disabled={loading}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !password}
          className={submitStyles[submitVariant]}
        >
          {loading && <Spinner />}
          {submitLabel}
        </button>
      </div>
    </section>
  );
}
