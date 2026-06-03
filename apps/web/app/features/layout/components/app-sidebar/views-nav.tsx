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
        <SidebarMenu className="gap-0.5">
          {COLUMNS.map((col) => {
            const isActive = isDashboard && sp.getAll("status").includes(col.id);
            const Icon = col.icon;
            return (
              <SidebarMenuItem key={col.id}>
                <SidebarMenuButton asChild isActive={isActive} className="text-sm">
                  <Link to={buildToggleUrl(base, sp, "status", col.id, isDashboard)}>
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${col.dot.replace("bg-", "text-")} ${isActive ? "opacity-100 scale-110" : "opacity-40"}`}
                    />
                    <span className="flex-1">{col.label}</span>
                    <Check
                      className={`h-3 w-3 shrink-0 transition-all duration-200 ${isActive ? "opacity-60 scale-100" : "opacity-0 scale-75"}`}
                      strokeWidth={2.5}
                    />
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
