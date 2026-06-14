import { requirePermission } from "@features/auth/server/guards";

export async function requireAdminRole(organizationId: string, userId: string): Promise<void> {
  await requirePermission(organizationId, userId, { settings: ["update"] });
}
