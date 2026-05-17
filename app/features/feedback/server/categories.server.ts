import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackCategories } from "@/db/schema";

export async function getOrgCategories(organizationId: string) {
  const db = getDb();
  return db.query.feedbackCategories.findMany({
    where: eq(feedbackCategories.organizationId, organizationId),
    columns: { id: true, name: true, color: true },
  });
}

export async function createCategory(organizationId: string, name: string, color: string) {
  const db = getDb();
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

export async function deleteCategory(organizationId: string, categoryId: string) {
  const db = getDb();
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
