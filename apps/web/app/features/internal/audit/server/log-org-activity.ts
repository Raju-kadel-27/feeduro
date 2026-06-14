import { getDb } from "@/db";
import type { auditActionEnum } from "@/db/schema";
import { auditLogs } from "@/db/schema";

export type AuditAction = (typeof auditActionEnum.enumValues)[number];

export type AuditActor = {
  id: string;
  email: string;
  name?: string | null;
};

function extractIp(request: Request): string | null {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    null
  );
}

export async function logOrgActivity(params: {
  orgId: string;
  actor: AuditActor;
  action: AuditAction;
  target?: { type: string; id?: string };
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      organizationId: params.orgId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorName: params.actor.name ?? null,
      action: params.action,
      targetType: params.target?.type ?? null,
      targetId: params.target?.id ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.request ? extractIp(params.request) : null,
    });
  } catch (err) {
    console.error("[audit] failed to log org activity:", err);
  }
}
