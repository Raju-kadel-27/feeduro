import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import {
  deleteWorkspace,
  updateWorkspaceName,
  updateWorkspaceSlug,
} from "@features/workspace/server/mutations.server";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/workspace";

const UpdateNameSchema = z.object({
  intent: z.literal("update_name"),
  name: z.string().min(1, "Name is required").max(100),
});

const UpdateSlugSchema = z.object({
  intent: z.literal("update_slug"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

const DeleteOrgSchema = z.object({
  intent: z.literal("delete_org"),
  organizationId: z.string(),
});

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const body = (await request.json()) as { intent: string };

  if (body.intent === "update_name") {
    await requirePermission(organizationId, session.user.id, { settings: ["update"] });
    const parsed = UpdateNameSchema.safeParse(body);
    if (!parsed.success) {
      return data({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    await updateWorkspaceName(request, organizationId, parsed.data.name);
    return data({ success: true });
  }

  if (body.intent === "update_slug") {
    await requirePermission(organizationId, session.user.id, { settings: ["update"] });
    const parsed = UpdateSlugSchema.safeParse(body);
    if (!parsed.success) {
      return data({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    await updateWorkspaceSlug(request, organizationId, parsed.data.slug);
    return data({ success: true, newSlug: parsed.data.slug });
  }

  if (body.intent === "delete_org") {
    await requirePermission(organizationId, session.user.id, { organization: ["delete"] });
    const parsed = DeleteOrgSchema.safeParse(body);
    if (!parsed.success) {
      return data({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    await deleteWorkspace(request, organizationId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
