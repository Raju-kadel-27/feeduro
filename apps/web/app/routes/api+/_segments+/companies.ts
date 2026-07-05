import { requireOrganization } from "@features/auth/server/guards";
import { CompanyActionSchema } from "@features/internal/segmentation/schemas/company";
import {
  deleteCompany,
  getOrgCompanies,
  updateCompany,
} from "@features/internal/segmentation/server/service";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/companies";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const companies = await getOrgCompanies(db, organizationId);
  return data({ companies });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    columns: { role: true },
  });
  if (memberRecord?.role !== "admin") {
    return data({ error: "Only admins can manage companies" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CompanyActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const action = parsed.data;

  if (action.intent === "update") {
    await updateCompany(db, organizationId, action.id, {
      name: action.name,
      monthlySpend: action.monthlySpend,
      plan: action.plan,
    });
    return data({ success: true });
  }

  await deleteCompany(db, organizationId, action.id);
  return data({ success: true });
}
