import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { ChangePasswordForm } from "@features/auth/components/change-password-form";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";

import type { Route } from "./+types/password";

export function meta() {
  return [{ title: "Change Password — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOrgBySlug(request, params.orgSlug);
  return null;
}

export default function PasswordSettings() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 bg-muted/10">
          <SidebarTrigger className="-ml-1" />
          <span className="text-lg font-semibold">Change Password</span>
        </header>

        <main className="p-8 max-w-[720px] mx-auto w-full space-y-8">
          <div>
            <h2 className="text-base font-bold text-foreground">Change Password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update the password for your Feediyo account. Other active sessions will be signed out
              when you save.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm max-w-sm">
            <ChangePasswordForm />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
