import { z } from "zod";

export const createRoleSchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1).max(64),
  permissions: z.record(z.string(), z.array(z.string())),
});

export const updateRoleSchema = z.object({
  intent: z.literal("update"),
  roleId: z.string().min(1),
  name: z.string().min(1).max(64).optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
});

export const deleteRoleSchema = z.object({
  intent: z.literal("delete"),
  roleId: z.string().min(1),
});

export const roleActionSchema = z.discriminatedUnion("intent", [
  createRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,
]);
