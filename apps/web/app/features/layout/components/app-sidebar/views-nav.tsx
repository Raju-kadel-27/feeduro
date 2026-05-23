import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import { COLUMNS } from "@features/roadmap/constants";
import { buildToggleUrl } from "./toggle-url";
import { Check } from "lucide-react";
import { Link } from "react-router";

type Props = { base: string; sp: URLSearchParams; isDashboard: boolean };

export function ViewsNav({ base, sp, isDashboard }: Props) {
  return (
    <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] font-semibold">
          Status
        </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {COLUMNS.map((col) => {
            const isActive = isDashboard && sp.getAll("status").includes(col.id);
            return (
              <SidebarMenuItem key={col.id}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={buildToggleUrl(base, sp, "status", col.id, isDashboard)}>
                    <span
                      className={`flex items-center justify-center h-3 w-3 rounded-sm border shrink-0 transition-colors ${isActive ? "bg-sidebar-primary border-sidebar-primary" : "border-sidebar-foreground/30"}`}
                    >
                      {isActive && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span>{col.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
