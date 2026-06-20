import { type AuditActor, logOrgActivity } from "@features/internal/audit/server/log-org-activity";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { widgetConfigs } from "@/db/schema";
import type { SaveSettingsInput, ToggleEnabledInput } from "../schemas/settings";
import { generateSigningSecret } from "../utils/crypto";

export async function saveWidgetSettings(orgId: string, input: SaveSettingsInput) {
  const db = getDb();
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

export async function toggleWidgetEnabled(orgId: string, input: ToggleEnabledInput) {
  const db = getDb();
  await db
    .update(widgetConfigs)
    .set({ enabled: input.enabled })
    .where(eq(widgetConfigs.organizationId, orgId));
  return { ok: true } as const;
}

export async function regenerateWidgetToken(orgId: string, actor: AuditActor, request: Request) {
  const db = getDb();
  const newToken = createId();
  await db
    .update(widgetConfigs)
    .set({ token: newToken })
    .where(eq(widgetConfigs.organizationId, orgId));
  await logOrgActivity({ orgId, actor, action: "widget_token_regenerated", target: { type: "widget" }, request });
  return { ok: true, newToken } as const;
}

export async function rotateWidgetSecret(orgId: string, actor: AuditActor, request: Request) {
  const db = getDb();
  const newSecret = generateSigningSecret();
  await db
    .update(widgetConfigs)
    .set({ signingSecret: newSecret })
    .where(eq(widgetConfigs.organizationId, orgId));
  await logOrgActivity({ orgId, actor, action: "widget_secret_rotated", target: { type: "widget" }, request });
  return { ok: true, newSecret } as const;
}

export async function revealWidgetSecret(orgId: string) {
  const db = getDb();
  const row = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.organizationId, orgId),
    columns: { signingSecret: true },
  });
  return { ok: true, secret: row?.signingSecret ?? "" } as const;
}

export async function saveWidgetAllowedOrigins(orgId: string, rawOrigins: string) {
  const db = getDb();
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
