import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { ChangePasswordForm } from "@features/auth/components/change-password-form";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { LogOut, ShieldCheck } from "lucide-react";

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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Change Password</span>
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Change Password</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Update the password for your Feediyo account.
            </p>
          </div>

          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Password</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose a strong, unique password you don't use elsewhere.
              </p>
            </div>
            <div className="px-6 py-6 max-w-sm">
              <ChangePasswordForm />
            </div>
          </section>

          <section className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <LogOut size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">Session behaviour</span>
              </div>
              <p className="text-sm text-muted-foreground">
                All other active sessions will be signed out immediately when you update your
                password. Your current session will remain active.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">Password tips</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Use at least 12 characters with a mix of letters, numbers, and symbols.</li>
                <li>Avoid reusing passwords from other sites.</li>
                <li>Consider using a password manager to generate and store it securely.</li>
              </ul>
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
