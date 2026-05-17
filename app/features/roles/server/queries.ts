import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { member } from "@/db/schema";

export async function isAdmin(organizationId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rec = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    columns: { role: true },
  });
  return rec?.role === "admin";
}
