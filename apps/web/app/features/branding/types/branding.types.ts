import type { BrandingSchema } from "../schemas/branding.schema";

export type BrandingFormValues = BrandingSchema;

export interface BrandingFormProps {
  defaultValues: BrandingFormValues;
}
