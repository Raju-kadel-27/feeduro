import { requireOrganization } from "@features/auth/server/guards";
import {
  createView,
  deleteView,
  getOrgViews,
  updateView,
} from "@features/internal/dashboard/server/views";
import type { Sort, ViewFilters } from "@features/internal/dashboard/types";
import { getDb } from "@middleware/cloudflare.server";
import { data } from "react-router";
import type { Route } from "./+types/views";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const views = await getOrgViews(db, organizationId);
  return data({ views });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
    const name = (body.name as string)?.trim();
    const emoji = (body.emoji as string) ?? "📌";
    const filters = (body.filters as ViewFilters) ?? {};
    const sort = (body.sort as Sort) ?? "newest";
    if (!name) return data({ error: "Name is required" }, { status: 400 });
    const view = await createView(organizationId, { name, emoji, filters, sort });
    return data({ view });
  }

  if (body.intent === "update") {
    const viewId = body.viewId as string;
    if (!viewId) return data({ error: "viewId required" }, { status: 400 });
    await updateView(organizationId, viewId, {
      name: body.name as string | undefined,
      emoji: body.emoji as string | undefined,
      filters: body.filters as ViewFilters | undefined,
      sort: body.sort as Sort | undefined,
    });
    return data({ success: true });
  }

  if (body.intent === "delete") {
    const viewId = body.viewId as string;
    if (!viewId) return data({ error: "viewId required" }, { status: 400 });
    try {
      await deleteView(db, organizationId, viewId);
      return data({ success: true });
    } catch (err) {
      return data({ error: (err as Error).message }, { status: 403 });
    }
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
