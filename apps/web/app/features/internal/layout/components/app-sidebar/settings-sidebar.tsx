import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@components/ui/sidebar";
import { usePlanLimits } from "@features/internal/billing/hooks/use-plan-limits";
import { usePendingPathname } from "@hooks/use-pending-pathname";
import { ChevronLeft, Crown } from "lucide-react";
import { Link } from "react-router";
import { makeSettingsSections } from "./settings-sections";

type Props = { base: string };

export function SettingsSidebar({ base }: Props) {
  const pathname = usePendingPathname();
  const planLimits = usePlanLimits();
  const sections = makeSettingsSections(base, planLimits);

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-base">
                <Link to={`${base}/dashboard`}>
                  <ChevronLeft />
                  <span>Back to dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {sections.map(({ label, items }) => (
        <div key={label}>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">{label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} className="text-base">
                      <Link to={item.url}>
                        <item.icon />
                        <span className="flex-1">{item.title}</span>
                        {item.locked && (
                          <Crown className="h-3 w-3 shrink-0 text-orange-400" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      ))}
    </SidebarContent>
  );
}
