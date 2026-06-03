import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import { ExternalLink } from "lucide-react";

type Props = { orgSlug: string };

export function PublicBoardLink({ orgSlug }: Props) {
  const url = import.meta.env.DEV
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${orgSlug}`
    : `https://${orgSlug}.feediyo.com`;
  return (
    <SidebarGroup className="py-0">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-base">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span>Public Board</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
