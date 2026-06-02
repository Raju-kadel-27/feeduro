import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { feedbackCategories } from "@/db/schema";
import { createCategory, deleteCategory, getOrgCategories } from "./categories.server";

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .default("#6366f1"),
});

export async function listCategories(organizationId: string) {
  return getOrgCategories(organizationId);
}

export async function createOrgCategory(
  organizationId: string,
  input: z.infer<typeof CreateCategorySchema>,
): Promise<
  | { data: { id: string; name: string; color: string } }
  | { error: "category_name_exists" }
> {
  try {
    const category = await createCategory(organizationId, input.name, input.color);
    return { data: category };
  } catch {
    return { error: "category_name_exists" };
  }
}

export async function deleteOrgCategory(
  organizationId: string,
  categoryId: string,
): Promise<boolean> {
  const db = getDb();
  const category = await db.query.feedbackCategories.findFirst({
    where: and(
      eq(feedbackCategories.id, categoryId),
      eq(feedbackCategories.organizationId, organizationId),
    ),
    columns: { id: true },
  });
  if (!category) return false;
  await deleteCategory(organizationId, categoryId);
  return true;
}
