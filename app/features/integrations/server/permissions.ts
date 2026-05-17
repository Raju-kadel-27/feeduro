import { data } from "react-router";
import { isAdmin } from "@features/roles/server/queries";

export async function requireAdminRole(
  organizationId: string,
  userId: string,
): Promise<void> {
  if (!(await isAdmin(organizationId, userId))) {
    throw data({ error: "Only admins can manage integrations" }, { status: 403 });
  }
}
