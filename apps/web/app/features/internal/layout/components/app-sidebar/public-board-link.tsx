import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import { getPublicBoardUrl } from "@features/domains/public-board-url";
import { ExternalLink } from "lucide-react";

type Props = { orgSlug: string };

export function PublicBoardLink({ orgSlug }: Props) {
  const url = import.meta.env.DEV
    ? `/${orgSlug}/portal/feedback`
    : getPublicBoardUrl(orgSlug);

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
