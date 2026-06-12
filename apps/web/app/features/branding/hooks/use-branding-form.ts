import { saveBranding } from "@features/branding/server/save-branding";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type BrandingSchema, brandingSchema } from "../schemas/branding.schema";
import type { BrandingFormValues } from "../types/branding.types";

export function useBrandingForm(defaultValues: BrandingFormValues, canHidePoweredBy: boolean) {
  const form = useForm<BrandingSchema>({
    resolver: zodResolver(brandingSchema),
    mode: "onChange",
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: saveBranding,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);

    form.reset(values);

    toast.success("Branding saved");
  });

  return {
    ...form,
    onSubmit,
    isSaving: mutation.isPending,
    proUnlocked: canHidePoweredBy,
  };
}
