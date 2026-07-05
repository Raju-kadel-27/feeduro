import { getAuth } from "@lib/auth/server";
import type { Db } from "@/db";

export async function updateWorkspaceName(
  db: Db,
  request: Request,
  organizationId: string,
  name: string,
) {
  await getAuth(db).api.updateOrganization({
    headers: request.headers,
    body: { data: { name }, organizationId },
  });
}

export async function updateWorkspaceSlug(
  db: Db,
  request: Request,
  organizationId: string,
  slug: string,
) {
  await getAuth(db).api.updateOrganization({
    headers: request.headers,
    body: { data: { slug }, organizationId },
  });
}

export async function deleteWorkspace(db: Db, request: Request, organizationId: string) {
  await getAuth(db).api.deleteOrganization({
    headers: request.headers,
    body: { organizationId },
  });
}
