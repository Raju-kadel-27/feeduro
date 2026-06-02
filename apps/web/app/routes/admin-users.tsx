import { requireSession } from "@lib/session";
import { ADMIN_PAGE_SIZE, listUsers } from "@features/admin/server/service";
import { getEnv } from "@utils/get-env";
import { data, redirect } from "react-router";
import { UsersTable } from "@features/admin/components/users-table";
import type { Route } from "./+types/admin-users";

function isPlatformAdmin(userId: string): boolean {
  const ids = (getEnv().PLATFORM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}

export function meta() {
  return [{ title: "Admin — Users — Feediyo" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  if (!isPlatformAdmin(session.user.id)) throw redirect("/");

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const offset = (page - 1) * ADMIN_PAGE_SIZE;

  const { users, total } = await listUsers({ search, offset });

  return data({ users, total, currentPage: page });
}

export function ErrorBoundary() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Failed to load admin users.</p>
    </div>
  );
}

export default function AdminUsersPage({ loaderData }: Route.ComponentProps) {
  const { users, total, currentPage } = loaderData;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} total · impersonate any account to debug their workspace
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-6">
        <UsersTable users={users} total={total} currentPage={currentPage} />
      </div>
    </div>
  );
}
