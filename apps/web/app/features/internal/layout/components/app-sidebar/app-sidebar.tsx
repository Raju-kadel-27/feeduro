import { Sidebar, SidebarHeader, SidebarSeparator } from "@components/ui/sidebar";
import { SidebarUserFooter } from "@features/internal/layout/components/sidebar-user-footer";
import { WorkspaceSwitcher } from "@features/internal/workspace/components/workspace-switcher";
import { usePendingPathname } from "@hooks/use-pending-pathname";
import { useParams } from "react-router";
import { SettingsSidebar } from "./settings-sidebar";
import { WorkspaceSidebar } from "./workspace-sidebar";

export function AppSidebar() {
  const pathname = usePendingPathname();
  const { orgSlug = "" } = useParams();
  const base = `/${orgSlug}`;
  const isSettingsRoute = pathname.includes("/settings");
  const isDashboard = pathname === `${base}/dashboard`;

  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarSeparator />
      <div key={isSettingsRoute ? "settings" : "workspace"} className="flex flex-col flex-1 overflow-hidden">
        {isSettingsRoute ? (
          <SettingsSidebar base={base} />
        ) : (
          <WorkspaceSidebar base={base} orgSlug={orgSlug} isDashboard={isDashboard} />
        )}
      </div>
      <SidebarUserFooter />
    </Sidebar>
  );
}
