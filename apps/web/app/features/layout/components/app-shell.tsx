import { SidebarInset, SidebarProvider } from "@components/ui/sidebar";
import { ImpersonateBanner } from "@features/admin/components/impersonate-banner";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ImpersonateBanner />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
