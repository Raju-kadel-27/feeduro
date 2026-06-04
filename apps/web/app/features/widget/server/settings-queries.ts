import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackBoards, widgetConfigs } from "@/db/schema";
import { generateSigningSecret } from "../utils/crypto";

export async function getWidgetSettings(orgId: string) {
  const db = getDb();

  // Single upsert: creates row if missing, backfills signingSecret if null via COALESCE.
  // Runs in parallel with the boards query since they are independent.
  const [[config], boards] = await Promise.all([
    db
      .insert(widgetConfigs)
      .values({ organizationId: orgId, signingSecret: generateSigningSecret() })
      .onConflictDoUpdate({
        target: widgetConfigs.organizationId,
        // Keep existing secret when present; fill it only when null (old rows).
        set: { signingSecret: sql`COALESCE(signing_secret, excluded.signing_secret)` },
      })
      .returning({
        id: widgetConfigs.id,
        token: widgetConfigs.token,
        enabled: widgetConfigs.enabled,
        boardId: widgetConfigs.boardId,
        position: widgetConfigs.position,
        theme: widgetConfigs.theme,
        allowedOrigins: widgetConfigs.allowedOrigins,
      }),
    db.query.feedbackBoards.findMany({
      where: and(
        eq(feedbackBoards.organizationId, orgId),
        eq(feedbackBoards.visibility, "public"),
      ),
      columns: { id: true, name: true, isDefault: true, embedToken: true },
    }),
  ]);

  if (!config) throw new Response("Widget config unavailable", { status: 500 });

  return {
    config,
    boards: boards.map((b) => ({
      id: b.id,
      name: b.name,
      isDefault: b.isDefault ?? false,
      embedToken: b.embedToken,
    })),
  };
}

