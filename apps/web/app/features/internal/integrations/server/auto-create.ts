import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { postExternalLinks } from "@/db/schema";
import type { IntegrationProvider } from "./queries";

export type AutoCreatePost = { id: string; title: string; description: string | null };

export function buildPostDescription(post: AutoCreatePost): string {
  return post.description
    ? `${post.description}\n\nCreated from Feeduro feedback #${post.id}`
    : `Created from Feeduro feedback #${post.id}`;
}

export async function isAlreadyLinked(
  db: Db,
  postId: string,
  provider: IntegrationProvider,
): Promise<boolean> {
  const existing = await db.query.postExternalLinks.findFirst({
    where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, provider)),
    columns: { id: true },
  });
  return !!existing;
}
