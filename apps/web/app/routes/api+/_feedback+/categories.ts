import { requireOrganization } from "@features/auth/server/guards";
import {
  createCategory,
  deleteCategory,
  getOrgCategories,
} from "@features/feedback/server/categories.server";
import { isAdmin } from "@features/roles/server/queries";
import { data } from "react-router";

import type { Route } from "./+types/categories";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const categories = await getOrgCategories(organizationId);
  return data({ categories });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
    if (!(await isAdmin(organizationId, session.user.id)))
      return data({ error: "Only admins can manage categories" }, { status: 403 });
    const name = (body.name as string)?.trim();
    const color = (body.color as string) ?? "#6366f1";
    if (!name) return data({ error: "Name is required" }, { status: 400 });
    try {
      const category = await createCategory(organizationId, name, color);
      return data({ category });
    } catch {
      return data({ error: "Category name already exists" }, { status: 409 });
    }
  }

  if (body.intent === "delete") {
    if (!(await isAdmin(organizationId, session.user.id)))
      return data({ error: "Only admins can manage categories" }, { status: 403 });
    const categoryId = body.categoryId as string;
    if (!categoryId) return data({ error: "categoryId required" }, { status: 400 });
    await deleteCategory(organizationId, categoryId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
