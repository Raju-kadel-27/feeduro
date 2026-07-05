import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { member } from "@/db/schema";

export async function isAdmin(db: Db, organizationId: string, userId: string): Promise<boolean> {
  const rec = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    columns: { role: true },
  });
  return rec?.role === "admin";
}
