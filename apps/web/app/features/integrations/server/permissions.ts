import { isAdmin } from "@features/roles/server/queries";
import { data } from "react-router";

export async function requireAdminRole(organizationId: string, userId: string): Promise<void> {
  if (!(await isAdmin(organizationId, userId))) {
    throw data({ error: "Only admins can manage integrations" }, { status: 403 });
  }
}
