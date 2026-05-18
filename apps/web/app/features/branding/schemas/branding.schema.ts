import { z } from "zod";
import type { ColorValue, LanguageValue, ThemeValue } from "../constants/branding-options";
import { COLOR_OPTIONS, LANGUAGE_OPTIONS, THEME_OPTIONS } from "../constants/branding-options";

const colorValues = COLOR_OPTIONS.map((o) => o.value) as unknown as [ColorValue, ...ColorValue[]];
const themeValues = THEME_OPTIONS.map((o) => o.value) as unknown as [ThemeValue, ...ThemeValue[]];
const languageValues = LANGUAGE_OPTIONS.map((o) => o.value) as unknown as [
  LanguageValue,
  ...LanguageValue[],
];

export const brandingSchema = z.object({
  logo: z.string(),
  name: z.string().min(1, "Required").max(32, "Max 32 characters"),
  primaryColor: z.enum(colorValues),
  theme: z.enum(themeValues),
  language: z.enum(languageValues),
  hidePoweredBy: z.boolean(),
});

export type BrandingSchema = z.infer<typeof brandingSchema>;
