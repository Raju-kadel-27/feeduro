import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postExternalLinks } from "@/db/schema";
import type { IntegrationProvider } from "./queries";

export type AutoCreatePost = { id: string; title: string; description: string | null };

export function buildPostDescription(post: AutoCreatePost): string {
  return post.description
    ? `${post.description}\n\nCreated from Feediyo feedback #${post.id}`
    : `Created from Feediyo feedback #${post.id}`;
}

export async function isAlreadyLinked(
  postId: string,
  provider: IntegrationProvider,
): Promise<boolean> {
  const db = getDb();
  const existing = await db.query.postExternalLinks.findFirst({
    where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, provider)),
    columns: { id: true },
  });
  return !!existing;
}
