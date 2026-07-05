import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { feedbackCategories } from "@/db/schema";
import { createCategory, deleteCategory, getOrgCategories } from "./categories";

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .default("#6366f1"),
});

export async function listCategories(db: Db, organizationId: string) {
  return getOrgCategories(db, organizationId);
}

export async function createOrgCategory(
  db: Db,
  organizationId: string,
  input: z.infer<typeof CreateCategorySchema>,
): Promise<
  | { data: { id: string; name: string; color: string } }
  | { error: "category_name_exists" }
> {
  try {
    const category = await createCategory(db, organizationId, input.name, input.color);
    return { data: category };
  } catch {
    return { error: "category_name_exists" };
  }
}

export async function deleteOrgCategory(
  db: Db,
  organizationId: string,
  categoryId: string,
): Promise<boolean> {
  const category = await db.query.feedbackCategories.findFirst({
    where: and(
      eq(feedbackCategories.id, categoryId),
      eq(feedbackCategories.organizationId, organizationId),
    ),
    columns: { id: true },
  });
  if (!category) return false;
  await deleteCategory(db, organizationId, categoryId);
  return true;
}
