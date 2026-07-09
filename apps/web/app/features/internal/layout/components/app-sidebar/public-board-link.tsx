import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import { getPublicBoardUrl } from "@features/domains/public-board-url";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { orgSlug: string };

export function PublicBoardLink({ orgSlug }: Props) {
  const [url, setUrl] = useState(
    import.meta.env.DEV ? `/${orgSlug}` : getPublicBoardUrl(orgSlug),
  );

  useEffect(() => {
    if (import.meta.env.DEV) {
      setUrl(`${window.location.origin}/${orgSlug}`);
    }
  }, [orgSlug]);
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
