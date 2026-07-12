import { extractBlockNoteText } from "@features/feedback/utils";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { changelogs } from "@/db/schema";

// The list UI only shows one truncated line of the body, but the BlockNote JSON
// bodies dominate the payload — compute the excerpt here and never ship the body.
export async function listChangelogEntries(db: Db, organizationId: string) {
  const entries = await db.query.changelogs.findMany({
    where: eq(changelogs.organizationId, organizationId),
    orderBy: [desc(changelogs.createdAt)],
    columns: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      body: true,
    },
  });

  return entries.map(({ body, ...rest }) => ({
    ...rest,
    excerpt: body ? extractBlockNoteText(body, 160) : "",
  }));
}
