import { PageHeader } from "@components/common/page-header";
import { Button } from "@components/ui/button";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { RoleFormDialog } from "@features/internal/roles/components/role-form-dialog";
import { RolesTable } from "@features/internal/roles/components/roles-table";
import type { OrgRole } from "@features/internal/roles/types";
import { authClient } from "@lib/auth/client";
import { getAuth } from "@lib/auth/server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Plus, ShieldCheck, Star } from "lucide-react";
import { useState } from "react";
import { data, Link, useParams } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/roles";

export function meta() {
  return [{ title: "Roles — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const planLimits = await getOrgPlanLimits(db, organizationId);
  if (!planLimits.customRoles) return data({ planLocked: true as const });

  const [memberRecord, rolesResult] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getAuth(db).api.listOrgRoles({ headers: request.headers, query: { organizationId } }),
  ]);

  return data({
    roles: (Array.isArray(rolesResult) ? rolesResult : []) as OrgRole[],
    isAdmin: memberRecord?.role === "admin",
    organizationId,
  });
}

export default function RolesSettings({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  if ("planLocked" in loaderData) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <PageHeader
            title="Roles & Permissions"
            icon={ShieldCheck}
            action={
              <Link
                to={`/${orgSlug}/settings/billing`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
                Upgrade to create roles
              </Link>
            }
          />
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">Built-in roles</p>
            <p className="text-xs text-muted-foreground mb-3">
              These roles are managed by the system and cannot be edited.
            </p>
            <div className="flex gap-2" role="list" aria-label="Built-in roles">
              {["admin", "member", "viewer"].map((r) => (
                <span key={r} role="listitem" className="px-2.5 py-0.5 rounded-full bg-background border text-xs font-medium capitalize">
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/50 dark:bg-orange-900/20">
            <p className="text-sm text-orange-800 dark:text-orange-300">
              Custom roles are available on the <span className="font-semibold">Professional</span> plan.
            </p>
            <Link
              to={`/${orgSlug}/settings/billing`}
              className="shrink-0 flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-900 transition-colors dark:text-orange-400 dark:hover:text-orange-200"
            >
              Upgrade <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            </Link>
          </div>
        </main>
      </>
    );
  }

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
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Roles & Permissions"
          icon={ShieldCheck}
          action={loaderData.isAdmin ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Role
            </Button>
          ) : undefined}
        />

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
