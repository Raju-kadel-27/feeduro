import { Controller } from "react-hook-form";

import { Input } from "@components/ui/input";

import { LANGUAGE_OPTIONS, THEME_OPTIONS } from "../constants/branding-options";
import { useBrandingForm } from "../hooks/use-branding-form";
import type { BrandingFormProps } from "../types/branding.types";

import { BrandingActions } from "./branding-actions";
import { BrandingColorSelect } from "./branding-color-select";
import { BrandingHint } from "./branding-hint";
import { BrandingLabel } from "./branding-label";
import { BrandingLogoField } from "./branding-logo-field";
import { BrandingRow } from "./branding-row";
import { BrandingSimpleSelect } from "./branding-simple-select";
import { BrandingSwitch } from "./branding-switch";

export function BrandingForm({ defaultValues }: BrandingFormProps) {
  const { control, register, watch, formState, onSubmit, isSaving, proUnlocked } =
    useBrandingForm(defaultValues);

  const watchedName = watch("name");

  return (
    <form onSubmit={onSubmit} className="w-full max-w-2xl">
      <BrandingRow>
        <BrandingLabel>Logo</BrandingLabel>

        <Controller
          name="logo"
          control={control}
          render={({ field }) => (
            <BrandingLogoField value={field.value} onChange={field.onChange} name={watchedName} />
          )}
        />
      </BrandingRow>

      <BrandingRow>
        <BrandingLabel htmlFor="branding-name">Name</BrandingLabel>

        <div className="w-[220px]">
          <Input id="branding-name" placeholder="Your brand" {...register("name")} />
        </div>
      </BrandingRow>

      <BrandingRow>
        <BrandingLabel>Primary Color</BrandingLabel>

        <Controller
          name="primaryColor"
          control={control}
          render={({ field }) => (
            <BrandingColorSelect value={field.value} onChange={field.onChange} />
          )}
        />
      </BrandingRow>

      <BrandingRow>
        <div className="flex items-center">
          <BrandingLabel>Theme</BrandingLabel>

          <BrandingHint text="Dynamic adapts to system preference." />
        </div>

        <Controller
          name="theme"
          control={control}
          render={({ field }) => (
            <BrandingSimpleSelect
              value={field.value}
              onChange={field.onChange}
              options={THEME_OPTIONS}
            />
          )}
        />
      </BrandingRow>

      <BrandingRow>
        <div className="flex items-center">
          <BrandingLabel>Language</BrandingLabel>

          <BrandingHint text="Auto detect browser language." />
        </div>

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

      <BrandingRow>
        <BrandingLabel>Hide Powered By</BrandingLabel>

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

      <BrandingActions isSubmitting={isSaving} isDirty={formState.isDirty} />
    </form>
  );
}
