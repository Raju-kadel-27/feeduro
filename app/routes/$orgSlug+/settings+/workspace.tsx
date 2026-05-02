import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@lib/session.server";
import type { Route } from "./+types/workspace";

export function meta() {
  return [{ title: "Workspace Settings — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { org } = await requireOrgBySlug(request, params.orgSlug);
  return { orgName: org.name, orgSlug: org.slug };
}

export default function WorkspaceSettings({ loaderData }: Route.ComponentProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Workspace</span>
        </header>
        <main className="p-6 max-w-3xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Workspace</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your workspace name, logo, and general settings.
            </p>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
