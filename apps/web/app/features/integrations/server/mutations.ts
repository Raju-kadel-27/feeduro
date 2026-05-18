import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { integrations, postExternalLinks } from "@/db/schema";
import type { IntegrationProvider } from "./queries";

export async function upsertIntegrationToken(
  organizationId: string,
  provider: IntegrationProvider,
  accessToken: string,
  defaultSettings: string,
): Promise<void> {
  const db = getDb();
  const existing = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.organizationId, organizationId),
      eq(integrations.provider, provider),
    ),
    columns: { settings: true },
  });
  await db
    .insert(integrations)
    .values({
      organizationId,
      provider,
      accessToken,
      settings: existing?.settings ?? defaultSettings,
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: { accessToken, updatedAt: new Date() },
    });
}

export async function updateIntegrationSettings(
  organizationId: string,
  provider: IntegrationProvider,
  settings: Record<string, unknown>,
  connectedByUserId?: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(integrations)
    .set({
      settings: JSON.stringify(settings),
      ...(connectedByUserId ? { connectedByUserId } : {}),
    })
    .where(
      and(eq(integrations.organizationId, organizationId), eq(integrations.provider, provider)),
    );
}

export async function deleteIntegration(
  organizationId: string,
  provider: IntegrationProvider,
): Promise<void> {
  const db = getDb();
  await db
    .delete(integrations)
    .where(
      and(eq(integrations.organizationId, organizationId), eq(integrations.provider, provider)),
    );
}

export type PostExternalLinkInput = {
  postId: string;
  organizationId: string;
  provider: string;
  externalId: string;
  externalUrl?: string;
  identifier?: string;
  externalTitle?: string;
  externalStatus?: string;
  linkedByUserId?: string;
  metadata?: string;
};

export async function insertPostExternalLink(input: PostExternalLinkInput): Promise<void> {
  const db = getDb();
  await db.insert(postExternalLinks).values({ ...input, lastSyncedAt: new Date() });
}

export async function upsertPostExternalLink(input: PostExternalLinkInput): Promise<void> {
  const db = getDb();
  const { postId, provider, ...rest } = input;
  await db
    .insert(postExternalLinks)
    .values({ postId, provider, ...rest, lastSyncedAt: new Date() })
    .onConflictDoUpdate({
      target: [postExternalLinks.postId, postExternalLinks.provider],
      set: {
        externalId: rest.externalId,
        externalUrl: rest.externalUrl,
        identifier: rest.identifier,
        externalTitle: rest.externalTitle,
        externalStatus: rest.externalStatus,
        metadata: rest.metadata,
        lastSyncedAt: new Date(),
      },
    });
}

export async function deletePostExternalLink(
  postId: string,
  provider: string,
  organizationId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(postExternalLinks)
    .where(
      and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, provider),
        eq(postExternalLinks.organizationId, organizationId),
      ),
    );
}
