import { type AuditActor, logOrgActivity } from "@features/internal/audit/server/log-org-activity";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { widgetConfigs } from "@/db/schema";
import type { SaveSettingsInput, ToggleEnabledInput } from "../schemas/settings";
import { generateSigningSecret } from "../utils/crypto";

export async function saveWidgetSettings(db: Db, orgId: string, input: SaveSettingsInput) {
  await db
    .update(widgetConfigs)
    .set({
      enabled: input.enabled,
      boardId: input.boardId || null,
      theme: input.theme,
    })
    .where(eq(widgetConfigs.organizationId, orgId));
  return { ok: true } as const;
}

export async function toggleWidgetEnabled(db: Db, orgId: string, input: ToggleEnabledInput) {
  await db
    .update(widgetConfigs)
    .set({ enabled: input.enabled })
    .where(eq(widgetConfigs.organizationId, orgId));
  return { ok: true } as const;
}

export async function regenerateWidgetToken(db: Db, orgId: string, actor: AuditActor, request: Request) {
  const newToken = createId();
  await db
    .update(widgetConfigs)
    .set({ token: newToken })
    .where(eq(widgetConfigs.organizationId, orgId));
  await logOrgActivity({ orgId, actor, action: "widget_token_regenerated", target: { type: "widget" }, request });
  return { ok: true, newToken } as const;
}

export async function rotateWidgetSecret(db: Db, orgId: string, actor: AuditActor, request: Request) {
  const newSecret = generateSigningSecret();
  await db
    .update(widgetConfigs)
    .set({ signingSecret: newSecret })
    .where(eq(widgetConfigs.organizationId, orgId));
  await logOrgActivity({ orgId, actor, action: "widget_secret_rotated", target: { type: "widget" }, request });
  return { ok: true, newSecret } as const;
}

export async function revealWidgetSecret(db: Db, orgId: string) {
  const row = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.organizationId, orgId),
    columns: { signingSecret: true },
  });
  return { ok: true, secret: row?.signingSecret ?? "" } as const;
}

export async function saveWidgetAllowedOrigins(db: Db, orgId: string, rawOrigins: string) {
  const normalized = rawOrigins
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
  await db
    .update(widgetConfigs)
    .set({ allowedOrigins: normalized || null })
    .where(eq(widgetConfigs.organizationId, orgId));
  return { ok: true } as const;
}
