import { SidebarInset, SidebarProvider } from "@components/ui/sidebar";
import { ImpersonateBanner } from "@features/internal/admin/components/impersonate-banner";
import { AppSidebar } from "@features/internal/layout/components/app-sidebar/app-sidebar";

export function AppShell({
  children,
  showSidebar = true,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
}) {
  return (
    <SidebarProvider>
      {showSidebar && <AppSidebar />}
      <SidebarInset>
        <ImpersonateBanner />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
