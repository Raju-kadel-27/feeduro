import { z } from "zod";

export const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "One number (0–9)", test: (v: string) => /\d/.test(v) },
  { id: "special", label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const strongPassword = z
  .string()
  .min(12, "At least 12 characters required")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/\d/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
