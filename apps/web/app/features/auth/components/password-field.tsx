import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { useForm } from "react-hook-form";

export function PasswordField({
  label,
  registration,
  error,
}: {
  label: string;
  registration: ReturnType<ReturnType<typeof useForm>["register"]>;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const id = registration.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          {...registration}
          id={id}
          type={show ? "text" : "password"}
          className={`w-full px-4 py-2.5 pr-10 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${error ? "border-destructive focus:ring-destructive/30" : "border-border"}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
