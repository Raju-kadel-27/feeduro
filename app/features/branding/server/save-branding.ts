import type { BrandingFormValues } from "../types/branding.types";

export async function saveBranding(data: BrandingFormValues) {
  const response = await fetch("/api/branding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const json = (await response.json()) as {
      error?: string;
    };

    throw new Error(json.error ?? "Failed to save branding");
  }

  return response.json();
}
