import { Sidebar, SidebarHeader, SidebarSeparator } from "@components/ui/sidebar";
import { SidebarUserFooter } from "@features/layout/components/sidebar-user-footer";
import { WorkspaceSwitcher } from "@features/workspace/components/workspace-switcher";
import { Star } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router";
import { SettingsSidebar } from "./settings-sidebar";
import { WorkspaceSidebar } from "./workspace-sidebar";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { orgSlug = "" } = useParams();
  const base = `/${orgSlug}`;
  const isSettingsRoute = location.pathname.includes("/settings");
  const isDashboard = location.pathname === `${base}/dashboard`;

  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarSeparator />
      {isSettingsRoute ? (
        <SettingsSidebar base={base} />
      ) : (
        <WorkspaceSidebar base={base} orgSlug={orgSlug} isDashboard={isDashboard} />
      )}
      <SidebarSeparator />
      <div className="px-3 py-2">
        <button
          type="button"
          onClick={() => navigate(`${base}/settings/billing`)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Star className="h-4 w-4 shrink-0" />
          Upgrade Plan
        </button>
      </div>
      <SidebarUserFooter />
    </Sidebar>
  );
}
