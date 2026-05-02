import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Check, Info, Lock, X } from "lucide-react";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ColorValue, LanguageValue, ThemeValue } from "./options";
import { COLOR_OPTIONS, LANGUAGE_OPTIONS, THEME_OPTIONS } from "./options";

export interface BrandingFormValues {
  logo: string;
  name: string;
  primaryColor: ColorValue;
  theme: ThemeValue;
  language: LanguageValue;
  hidePoweredBy: boolean;
}

interface BrandingFormProps {
  defaultValues: BrandingFormValues;
}

// ── inline primitives ──────────────────────────────────────────────────────

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-4 border-b border-border/70",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none text-foreground shrink-0">
      {children}
    </label>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center align-middle ml-1.5 cursor-default">
      <Info className="size-3.5 text-muted-foreground" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[220px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
        {text}
      </span>
    </span>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      id={id}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function ColorSelect({
  value,
  onChange,
}: {
  value: ColorValue;
  onChange: (v: ColorValue) => void;
}) {
  const selected = COLOR_OPTIONS.find((o) => o.value === value);
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <span className="size-2.5 rounded-full" style={{ background: selected?.hex }} />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ColorValue)}
        className={cn(
          "h-8 appearance-none rounded-md border border-border bg-transparent pl-7 pr-8 text-xs font-medium shadow-sm",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "min-w-[140px] cursor-pointer",
        )}
      >
        {COLOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SimpleSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "h-8 appearance-none rounded-md border border-border bg-transparent px-3 text-xs font-medium shadow-sm",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "min-w-[140px] cursor-pointer",
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function LogoField({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  name: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const initials = (name || "??").trim().slice(0, 2).toUpperCase();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="size-8 rounded-md bg-primary hover:ring-2 hover:ring-ring/50 flex items-center justify-center overflow-hidden transition shadow-sm"
        title="Upload logo"
      >
        {value ? (
          <img src={value} alt="logo" className="size-full object-cover" />
        ) : (
          <span className="text-[11px] font-semibold text-primary-foreground tracking-wide">
            {initials}
          </span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-muted-foreground hover:text-foreground transition"
          title="Remove logo"
        >
          <X className="size-3.5" />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ── main form ──────────────────────────────────────────────────────────────

export function BrandingForm({ defaultValues }: BrandingFormProps) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<BrandingFormValues>({
    mode: "onChange",
    defaultValues,
  });

  const watchedName = watch("name");
  const proUnlocked = false;

  const { mutateAsync: saveBranding } = useMutation({
    mutationFn: async (data: BrandingFormValues) => {
      const res = await fetch("/api/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Failed to save");
      }
      return res.json();
    },
  });

  const onSubmit = async (data: BrandingFormValues) => {
    await saveBranding(data);
    reset(data);
    toast.success("Branding saved");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl">
      {/* Logo */}
      <Row>
        <Label>Logo</Label>
        <Controller
          name="logo"
          control={control}
          render={({ field }) => (
            <LogoField value={field.value} onChange={field.onChange} name={watchedName} />
          )}
        />
      </Row>

      {/* Name */}
      <Row>
        <Label htmlFor="branding-name">Name</Label>
        <div className="w-[220px]">
          <Input
            id="branding-name"
            aria-invalid={!!errors.name}
            placeholder="Your brand"
            {...register("name", {
              required: "Required",
              maxLength: { value: 32, message: "Max 32 characters" },
            })}
            className={errors.name ? "border-destructive focus-visible:ring-destructive/40" : ""}
          />
          {errors.name && (
            <p className="text-[11px] text-destructive mt-1.5 text-right">{errors.name.message}</p>
          )}
        </div>
      </Row>

      {/* Primary Color */}
      <Row>
        <Label>Primary Color</Label>
        <Controller
          name="primaryColor"
          control={control}
          render={({ field }) => <ColorSelect value={field.value} onChange={field.onChange} />}
        />
      </Row>

      {/* Theme */}
      <Row>
        <div className="flex items-center">
          <Label>Theme</Label>
          <Hint text="Dynamic adapts to the viewer's system preference." />
        </div>
        <Controller
          name="theme"
          control={control}
          render={({ field }) => (
            <SimpleSelect<ThemeValue>
              value={field.value}
              onChange={field.onChange}
              options={THEME_OPTIONS}
            />
          )}
        />
      </Row>

      {/* Language */}
      <Row>
        <div className="flex items-center">
          <Label>Language</Label>
          <Hint text="Auto-detect uses the viewer's browser language." />
        </div>
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <SimpleSelect<LanguageValue>
              value={field.value}
              onChange={field.onChange}
              options={LANGUAGE_OPTIONS}
            />
          )}
        />
      </Row>

      {/* Hide Powered By */}
      <Row>
        <div className="flex items-center">
          <Label>Hide "Powered by" Branding</Label>
          <Hint text="Available on Pro plans and above." />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-amber-500/90" title="Pro feature">
            <Lock className="size-3.5" />
          </span>
          <Controller
            name="hidePoweredBy"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onChange={field.onChange} disabled={!proUnlocked} />
            )}
          />
        </div>
      </Row>

      {/* Save */}
      <div className="pt-5">
        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting || !isDirty}
          className="w-auto px-4 gap-1.5"
        >
          {isSubmitting ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <Check className="size-3.5" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}
