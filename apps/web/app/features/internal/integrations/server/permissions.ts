import { requirePermission } from "@features/auth/server/guards";
import type { Db } from "@/db";

export async function requireAdminRole(db: Db, organizationId: string, userId: string): Promise<void> {
  await requirePermission(db, organizationId, userId, { settings: ["update"] });
}
