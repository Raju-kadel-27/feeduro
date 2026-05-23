export interface BrandingMeta {
  primaryColor: string;
  theme: "dynamic" | "light" | "dark";
  language: string;
  hidePoweredBy: boolean;
}

export const DEFAULT_BRANDING: BrandingMeta = {
  primaryColor: "indigo",
  theme: "dynamic",
  language: "auto",
  hidePoweredBy: false,
};

export function parseBranding(metadata: string | null): BrandingMeta {
  if (!metadata) return DEFAULT_BRANDING;
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return { ...DEFAULT_BRANDING, ...((parsed.branding as Partial<BrandingMeta>) ?? {}) };
  } catch {
    return DEFAULT_BRANDING;
  }
}
