import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { member, organizationRole } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/roles";

const BUILTIN_ROLES = new Set(["admin", "member", "viewer"]);

const RolesActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("delete"),
    roleId: z.string().min(1, "roleId is required"),
  }),
]);

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RolesActionSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request";
    return data({ error: message }, { status: 400 });
  }

  const body = parsed.data;

  if (body.intent === "delete") {
    await requirePermission(db, organizationId, session.user.id, { ac: ["delete"] });

    const roleRecord = await db.query.organizationRole.findFirst({
      where: and(
        eq(organizationRole.id, body.roleId),
        eq(organizationRole.organizationId, organizationId),
      ),
      columns: { role: true },
    });

    if (!roleRecord) {
      return data({ error: "Role not found" }, { status: 404 });
    }

    if (BUILTIN_ROLES.has(roleRecord.role)) {
      return data({ error: "Built-in roles cannot be deleted" }, { status: 400 });
    }

    // Atomic: reassign orphaned members then delete the role so there is never
    // a window where members hold a non-existent role.
    await db.transaction(async (tx) => {
      await tx
        .update(member)
        .set({ role: "member" })
        .where(
          and(eq(member.organizationId, organizationId), eq(member.role, roleRecord.role)),
        );

      await tx
        .delete(organizationRole)
        .where(
          and(
            eq(organizationRole.id, body.roleId),
            eq(organizationRole.organizationId, organizationId),
          ),
        );
    });

    return data({ success: true });
  }
}
