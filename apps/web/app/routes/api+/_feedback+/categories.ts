import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import {
  createCategory,
  deleteCategory,
  getOrgCategories,
} from "@features/feedback/server/categories";
import { getDb } from "~/middleware/cloudflare.server";
import { data } from "react-router";

import type { Route } from "./+types/categories";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const categories = await getOrgCategories(db, organizationId);
  return data({ categories });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
    await requirePermission(db, organizationId, session.user.id, { feedback: ["update"] });
    const name = (body.name as string)?.trim();
    const color = (body.color as string) ?? "#6366f1";
    if (!name) return data({ error: "Name is required" }, { status: 400 });
    try {
      const category = await createCategory(db, organizationId, name, color);
      return data({ category });
    } catch {
      return data({ error: "Category name already exists" }, { status: 409 });
    }
  }

  if (body.intent === "delete") {
    await requirePermission(db, organizationId, session.user.id, { feedback: ["update"] });
    const categoryId = body.categoryId as string;
    if (!categoryId) return data({ error: "categoryId required" }, { status: 400 });
    await deleteCategory(db, organizationId, categoryId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
