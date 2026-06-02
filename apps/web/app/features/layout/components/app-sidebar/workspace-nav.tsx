import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Bot, FileText, Gift, Map, Settings, Share2 } from "lucide-react";
import type { ElementType } from "react";
import { Link, useLocation } from "react-router";

type NavItem = { title: string; url: string; icon: ElementType; badge?: number };

type Props = { base: string; orgSlug: string };

export function WorkspaceNav({ base, orgSlug }: Props) {
  const location = useLocation();

  const { data } = useQuery({
    queryKey: ["autopilot-count", orgSlug],
    queryFn: async () => {
      const r = await fetch("/api/autopilot/count");
      return r.json() as Promise<{ count: number }>;
    },
    enabled: !!orgSlug,
    staleTime: 60_000,
  });

  const pendingAutopilotCount = data?.count ?? 0;

  const items: NavItem[] = [
    { title: "Analytics", url: `${base}/analytics`, icon: BarChart2 },
    { title: "Roadmap", url: `${base}/roadmap`, icon: Map },
    { title: "Changelog", url: `${base}/changelog`, icon: FileText },
    { title: "Autopilot", url: `${base}/autopilot`, icon: Bot, badge: pendingAutopilotCount },
    { title: "Share", url: `${base}/share`, icon: Share2 },
    { title: "Affiliate", url: `${base}/affiliate`, icon: Gift },
    { title: "Settings", url: `${base}/settings`, icon: Settings },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={location.pathname === item.url} className="text-sm">
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                  {(item.badge ?? 0) > 0 && (
                    <span className="ml-auto text-[10px] font-semibold tabular-nums bg-amber-400/15 text-amber-500 dark:text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
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
