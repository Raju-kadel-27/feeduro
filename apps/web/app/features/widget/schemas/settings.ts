import { z } from "zod";

export const WidgetPositionSchema = z.enum(["left", "right"]);
export const WidgetThemeSchema = z.enum(["light", "dark", "auto"]);

export const SaveSettingsSchema = z.object({
  intent: z.literal("save"),
  enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
  boardId: z.string().optional(),
  position: WidgetPositionSchema,
  theme: WidgetThemeSchema,
});

export const ToggleEnabledSchema = z.object({
  intent: z.literal("toggle-enabled"),
  enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const RegenerateTokenSchema = z.object({ intent: z.literal("regenerate") });
export const RotateSecretSchema = z.object({ intent: z.literal("rotate-secret") });
export const RevealSecretSchema = z.object({ intent: z.literal("reveal-secret") });

export const SaveOriginsSchema = z.object({
  intent: z.literal("save-origins"),
  allowedOrigins: z.string(),
});

export const SettingsActionSchema = z.discriminatedUnion("intent", [
  SaveSettingsSchema,
  ToggleEnabledSchema,
  RegenerateTokenSchema,
  RotateSecretSchema,
  RevealSecretSchema,
  SaveOriginsSchema,
]);

export type SaveSettingsInput = z.infer<typeof SaveSettingsSchema>;
export type ToggleEnabledInput = z.infer<typeof ToggleEnabledSchema>;
