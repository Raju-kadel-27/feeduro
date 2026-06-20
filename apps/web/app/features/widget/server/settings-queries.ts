import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackBoards, widgetConfigs } from "@/db/schema";
import { generateSigningSecret } from "../utils/crypto";

export async function getWidgetSettings(orgId: string) {
  const db = getDb();

  const [existing, rawBoards] = await Promise.all([
    db.query.widgetConfigs.findFirst({
      where: eq(widgetConfigs.organizationId, orgId),
      columns: {
        id: true,
        token: true,
        enabled: true,
        boardId: true,
        theme: true,
        allowedOrigins: true,
        signingSecret: true,
      },
    }),
    db.query.feedbackBoards.findMany({
      where: and(
        eq(feedbackBoards.organizationId, orgId),
        eq(feedbackBoards.visibility, "public"),
      ),
      columns: { id: true, name: true, isDefault: true, embedToken: true },
    }),
  ]);

  const boards = rawBoards.map((b) => ({
    id: b.id,
    name: b.name,
    isDefault: b.isDefault ?? false,
    embedToken: b.embedToken,
  }));

  if (!existing) {
    const [config] = await db
      .insert(widgetConfigs)
      .values({ organizationId: orgId, signingSecret: generateSigningSecret() })
      .returning({
        id: widgetConfigs.id,
        token: widgetConfigs.token,
        enabled: widgetConfigs.enabled,
        boardId: widgetConfigs.boardId,
        theme: widgetConfigs.theme,
        allowedOrigins: widgetConfigs.allowedOrigins,
      });
    if (!config) throw new Response("Widget config unavailable", { status: 500 });
    return { config, boards };
  }

  if (!existing.signingSecret) {
    await db
      .update(widgetConfigs)
      .set({ signingSecret: generateSigningSecret() })
      .where(eq(widgetConfigs.organizationId, orgId));
  }

  const { signingSecret: _secret, ...config } = existing;
  return { config, boards };
}

