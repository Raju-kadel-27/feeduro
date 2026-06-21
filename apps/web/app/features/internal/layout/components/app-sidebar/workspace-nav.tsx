import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import { BarChart2, FileText, Map, Settings, Share2 } from "lucide-react";
import type { ElementType } from "react";
import { Link, useLocation } from "react-router";

type NavItem = { title: string; url: string; icon: ElementType };

type Props = { base: string; orgSlug: string };

export function WorkspaceNav({ base, orgSlug: _orgSlug }: Props) {
  const location = useLocation();

  const items: NavItem[] = [
    { title: "Analytics", url: `${base}/analytics`, icon: BarChart2 },
    { title: "Roadmap", url: `${base}/roadmap`, icon: Map },
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
              <SidebarMenuButton asChild isActive={location.pathname === item.url} className="text-base">
                <Link to={item.url} prefetch="intent">
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
