import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import { usePlanLimits } from "@features/internal/billing/hooks/use-plan-limits";
import { usePendingPathname } from "@hooks/use-pending-pathname";
import { BarChart2, Crown, FileText, Milestone, Settings, Share2 } from "lucide-react";
import type { ElementType } from "react";
import { Link } from "react-router";

type NavItem = { title: string; url: string; icon: ElementType; locked?: boolean };

type Props = { base: string; orgSlug: string };

export function WorkspaceNav({ base, orgSlug: _orgSlug }: Props) {
  const pathname = usePendingPathname();
  const planLimits = usePlanLimits();

  const items: NavItem[] = [
    { title: "Analytics", url: `${base}/analytics`, icon: BarChart2, locked: planLimits !== null && !planLimits.analytics },
    { title: "Roadmap", url: `${base}/roadmap`, icon: Milestone },
    { title: "Changelog", url: `${base}/changelog`, icon: FileText },
    { title: "Share", url: `${base}/share`, icon: Share2 },
    { title: "Settings", url: `${base}/settings`, icon: Settings },
  ];

  return (
    <SidebarGroup>
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
  );
}
