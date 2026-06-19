import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditCategory } from "../constants";
import { AUDIT_CATEGORIES, AUDIT_PAGE_SIZE } from "../constants";

export type AuditLogRow = {
  id: string;
  actorEmail: string;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

export async function listAuditLogs(orgId: string, page: number, category?: AuditCategory) {
  const db = getDb();
  const offset = (page - 1) * AUDIT_PAGE_SIZE;
  const actions = category ? AUDIT_CATEGORIES[category] : null;

  const where = actions
    ? and(eq(auditLogs.organizationId, orgId), inArray(auditLogs.action, actions))
    : eq(auditLogs.organizationId, orgId);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        actorEmail: auditLogs.actorEmail,
        actorName: auditLogs.actorName,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(AUDIT_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where),
  ]);

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}
