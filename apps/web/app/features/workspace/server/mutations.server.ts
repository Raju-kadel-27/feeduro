import { auth } from "@/app/lib/auth/server";

export async function updateWorkspaceName(request: Request, organizationId: string, name: string) {
  await auth.api.updateOrganization({
    headers: request.headers,
    body: { data: { name }, organizationId },
  });
}

export async function updateWorkspaceSlug(request: Request, organizationId: string, slug: string) {
  await auth.api.updateOrganization({
    headers: request.headers,
    body: { data: { slug }, organizationId },
  });
}

export async function deleteWorkspace(request: Request, organizationId: string) {
  await auth.api.deleteOrganization({
    headers: request.headers,
    body: { organizationId },
  });
}
