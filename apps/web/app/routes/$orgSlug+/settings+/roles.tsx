import { Button } from "@components/ui/button";
import { SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { RoleFormDialog } from "@features/internal/roles/components/role-form-dialog";
import { RolesTable } from "@features/internal/roles/components/roles-table";
import type { OrgRole } from "@features/internal/roles/types";
import { authClient } from "@lib/auth/client";
import { auth } from "@lib/auth/server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { useState } from "react";
import { getDb } from "@/db";
import { member } from "@/db/schema";
import type { Route } from "./+types/roles";

export function meta() {
  return [{ title: "Roles — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);

  const memberRecord = await getDb().query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
  });

  const rolesResult = await auth.api.listOrgRoles({
    headers: request.headers,
    query: { organizationId },
  });

  return {
    roles: (Array.isArray(rolesResult) ? rolesResult : []) as OrgRole[],
    isAdmin: memberRecord?.role === "admin",
    organizationId,
  };
}

export default function RolesSettings({ loaderData }: Route.ComponentProps) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: rolesData } = useQuery({
    queryKey: ["org-roles"],
    queryFn: async () => {
      const result = await authClient.organization.listRoles();
      return (result.data ?? []) as OrgRole[];
    },
    initialData: loaderData.roles,
    staleTime: 30_000,
  });

  const { mutate: createRole, isPending: isCreating } = useMutation({
    mutationFn: async ({
      name,
      permissions,
    }: {
      name: string;
      permissions: Record<string, string[]>;
    }) => {
      const result = await authClient.organization.createRole({
        role: name,
        permission: permissions,
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to create role");
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-roles"] });
      setShowCreate(false);
    },
  });

  const { mutate: updateRole, isPending: isUpdating } = useMutation({
    mutationFn: async ({
      roleId,
      name,
      permissions,
    }: {
      roleId: string;
      name: string;
      permissions: Record<string, string[]>;
    }) => {
      const result = await authClient.organization.updateRole({
        roleId,
        data: { roleName: name, permission: permissions },
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to update role");
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-roles"] }),
  });

  const {
    mutate: deleteRole,
    isPending: isDeleting,
    variables: deletingRoleId,
  } = useMutation({
    mutationFn: async (roleId: string) => {
      const result = await authClient.organization.deleteRole({ roleId });
      if (result.error) throw new Error(result.error.message ?? "Failed to delete role");
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-roles"] }),
  });

  const roles = rolesData ?? loaderData.roles;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <span className="text-sm font-medium">Roles & Permissions</span>
      </header>

      <main className="p-6 max-w-[840px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create custom roles with fine-grained permissions for your team members.
            </p>
          </div>
          {loaderData.isAdmin && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Role
            </Button>
          )}
        </div>

        <div className="mb-6 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-1">Built-in roles</p>
          <p className="text-xs text-muted-foreground mb-3">
            These roles are managed by the system and cannot be edited.
          </p>
          <div className="flex gap-2" role="list" aria-label="Built-in roles">
            {["admin", "member", "viewer"].map((r) => (
              <span
                key={r}
                role="listitem"
                className="px-2.5 py-0.5 rounded-full bg-background border text-xs font-medium capitalize"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <section>
          <h2 className="text-base font-semibold mb-1">Custom roles</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {roles.length} custom role{roles.length !== 1 ? "s" : ""} defined.
          </p>
          <RolesTable
            roles={roles}
            isAdmin={loaderData.isAdmin}
            onDelete={(roleId) => deleteRole(roleId)}
            onUpdate={(roleId, name, permissions) => updateRole({ roleId, name, permissions })}
            deletingRoleId={isDeleting ? deletingRoleId : undefined}
            isPendingUpdate={isUpdating}
            onCreateClick={() => setShowCreate(true)}
          />
        </section>
      </main>

      {showCreate && (
        <RoleFormDialog
          onClose={() => setShowCreate(false)}
          onSubmit={(name, permissions) => createRole({ name, permissions })}
          isPending={isCreating}
        />
      )}
    </>
  );
}
