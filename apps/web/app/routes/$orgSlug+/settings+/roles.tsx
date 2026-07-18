import { PageHeader } from "@components/common/page-header";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { Button } from "@components/ui/button";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { PlanBanner } from "@features/internal/billing/components/plan-banner";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { RoleFormDialog } from "@features/internal/roles/components/role-form-dialog";
import { RolesTable } from "@features/internal/roles/components/roles-table";
import type { OrgRole } from "@features/internal/roles/types";
import { authClient } from "@lib/auth/client";
import { getAuth } from "@lib/auth/server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Plus, ShieldCheck, Star } from "lucide-react";
import { Suspense, useState } from "react";
import { Await, Link, useParams } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/roles";

type RolesData =
  | { planLocked: true }
  | { roles: OrgRole[]; isAdmin: boolean; organizationId: string };

export function meta() {
  return [{ title: "Roles — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const dataPromise: Promise<RolesData> = Promise.all([
    getOrgPlanLimits(db, organizationId),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    // biome-ignore lint/suspicious/noExplicitAny: Better Auth organization plugin endpoints are not statically inferred
    (getAuth(db).api as any).listOrgRoles({ headers: request.headers, query: { organizationId } }),
  ]).then(([planLimits, memberRecord, rolesResult]) => {
    if (!planLimits.customRoles) return { planLocked: true as const };
    return {
      roles: (Array.isArray(rolesResult) ? rolesResult : []) as OrgRole[],
      isAdmin: memberRecord?.role === "admin",
      organizationId,
    };
  });
  return { dataPromise };
}

export default function RolesSettings({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await resolve={loaderData.dataPromise as unknown as Promise<RolesData>}>
          {(pageData) => {
            if ("planLocked" in pageData) {
              return (
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
                        Upgrade
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
                  <PlanBanner>
                    Custom roles are available on the <span className="font-semibold">Professional</span> plan.
                  </PlanBanner>
                </main>
              );
            }
            return <RolesContent {...pageData} />;
          }}
        </Await>
      </Suspense>
    </>
  );
}

type RolesContentProps = Exclude<RolesData, { planLocked: true }>;

function RolesContent({ roles: initialRoles, isAdmin, organizationId }: RolesContentProps) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: rolesData } = useQuery({
    queryKey: ["org-roles"],
    queryFn: async () => {
      const result = await authClient.organization.listRoles();
      return (result.data ?? []) as OrgRole[];
    },
    initialData: initialRoles,
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

  const roles = rolesData ?? initialRoles;

  return (
    <>
      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Roles & Permissions"
          icon={ShieldCheck}
          action={isAdmin ? (
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
            isAdmin={isAdmin}
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
