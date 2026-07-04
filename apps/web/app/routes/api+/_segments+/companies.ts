import { requireOrganization } from "@features/auth/server/guards";
import { CompanyActionSchema } from "@features/internal/segmentation/schemas/company";
import {
  deleteCompany,
  getOrgCompanies,
  updateCompany,
} from "@features/internal/segmentation/server/service";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { member } from "@/db/schema";

import type { Route } from "./+types/companies";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const companies = await getOrgCompanies(organizationId);
  return data({ companies });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const db = getDb();

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
    await updateCompany(organizationId, action.id, {
      name: action.name,
      monthlySpend: action.monthlySpend,
      plan: action.plan,
    });
    return data({ success: true });
  }

  await deleteCompany(organizationId, action.id);
  return data({ success: true });
}
