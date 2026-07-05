import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackCategories } from "@/db/schema";

export async function getOrgCategories(db: Db, organizationId: string) {
  return db.query.feedbackCategories.findMany({
    where: eq(feedbackCategories.organizationId, organizationId),
    columns: { id: true, name: true, color: true },
  });
}

export async function createCategory(db: Db, organizationId: string, name: string, color: string) {
  const [category] = await db
    .insert(feedbackCategories)
    .values({ organizationId, name: name.trim(), color })
    .returning({
      id: feedbackCategories.id,
      name: feedbackCategories.name,
      color: feedbackCategories.color,
    });
  return category;
}

export async function deleteCategory(db: Db, organizationId: string, categoryId: string) {
  // Sets feedback_posts.category_id to NULL via ON DELETE SET NULL constraint
  await db
    .delete(feedbackCategories)
    .where(
      and(
        eq(feedbackCategories.id, categoryId),
        eq(feedbackCategories.organizationId, organizationId),
      ),
    );
}
