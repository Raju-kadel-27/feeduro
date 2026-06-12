import { Input } from "@components/ui/input";
import type { ReactNode } from "react";
import { Controller } from "react-hook-form";

import { LANGUAGE_OPTIONS } from "../constants/branding-options";
import { useBrandingForm } from "../hooks/use-branding-form";
import type { BrandingFormProps } from "../types/branding.types";

import { BrandingActions } from "./branding-actions";
import { BrandingColorSelect } from "./branding-color-select";
import { BrandingLogoField } from "./branding-logo-field";
import { BrandingPreview } from "./branding-preview";
import { BrandingRow } from "./branding-row";
import { BrandingSimpleSelect } from "./branding-simple-select";
import { BrandingSwitch } from "./branding-switch";
import { BrandingThemeCards } from "./branding-theme-cards";

export function BrandingForm({ defaultValues, canHidePoweredBy }: BrandingFormProps) {
  const { control, register, watch, formState, onSubmit, isSaving, proUnlocked } =
    useBrandingForm(defaultValues, canHidePoweredBy);

  const watchedName = watch("name");
  const watchedLogo = watch("logo");
  const watchedColor = watch("primaryColor");
  const watchedTheme = watch("theme");

  return (
    <div className="flex gap-12 items-start">
      <form onSubmit={onSubmit} className="flex-1 min-w-0">
        {/* Identity */}
        <Section title="Identity">
          <BrandingRow
            label="Logo"
            description="Shown on your public portal and in emails."
          >
            <Controller
              name="logo"
              control={control}
              render={({ field }) => (
                <BrandingLogoField value={field.value} onChange={field.onChange} name={watchedName} />
              )}
            />
          </BrandingRow>

          <BrandingRow
            label="Name"
            description="Your organization's public-facing display name."
            htmlFor="branding-name"
          >
            <div className="w-[220px]">
              <Input id="branding-name" placeholder="Acme Corp" {...register("name")} />
            </div>
          </BrandingRow>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" className="mt-8">
          <BrandingRow
            label="Accent Color"
            description="Applied to buttons and interactive highlights."
          >
            <Controller
              name="primaryColor"
              control={control}
              render={({ field }) => (
                <BrandingColorSelect value={field.value} onChange={field.onChange} />
              )}
            />
          </BrandingRow>

          <BrandingRow
            label="Theme"
            description="Portal display mode for your visitors."
          >
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <BrandingThemeCards value={field.value} onChange={field.onChange} />
              )}
            />
          </BrandingRow>
        </Section>

        {/* Localization */}
        <Section title="Localization" className="mt-8">
          <BrandingRow
            label="Language"
            description="Default language for your portal. Auto-detect uses the visitor's browser preference."
          >
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <BrandingSimpleSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={LANGUAGE_OPTIONS}
                />
              )}
            />
          </BrandingRow>
        </Section>

        {/* Advanced */}
        <Section title="Advanced" className="mt-8">
          <BrandingRow
            label="Hide «Powered by»"
            description={
              proUnlocked
                ? "Remove Feeduro branding from your portal."
                : "Upgrade to Pro to remove Feeduro branding."
            }
          >
            <Controller
              name="hidePoweredBy"
              control={control}
              render={({ field }) => (
                <BrandingSwitch
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={!proUnlocked}
                />
              )}
            />
          </BrandingRow>
        </Section>

        <BrandingActions isSubmitting={isSaving} isDirty={formState.isDirty} />
      </form>

      {/* Live preview — visible on xl+ screens */}
      <div className="sticky top-6 w-[300px] shrink-0 hidden xl:block">
        <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
        <BrandingPreview
          name={watchedName}
          logo={watchedLogo}
          primaryColor={watchedColor}
          theme={watchedTheme}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
        {title}
      </h2>
      {children}
    </div>
  );
}
