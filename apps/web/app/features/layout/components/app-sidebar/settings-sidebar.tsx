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
import { makeSettingsSections } from "./settings-sections";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router";

type Props = { base: string };

export function SettingsSidebar({ base }: Props) {
  const location = useLocation();
  const sections = makeSettingsSections(base);

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-base">
                <Link to={`${base}/dashboard`}>
                  <ArrowLeft />
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
                    <SidebarMenuButton asChild isActive={location.pathname === item.url} className="text-base">
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
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
