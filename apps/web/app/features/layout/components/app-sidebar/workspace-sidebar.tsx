import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from "@components/ui/sidebar";
import { NewBoardDialog } from "@features/feedback/components/settings/new-board-dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { PublicBoardLink } from "./public-board-link";
import { ViewsNav } from "./views-nav";
import { WorkspaceNav } from "./workspace-nav";

type Props = { base: string; orgSlug: string; isDashboard: boolean };

export function WorkspaceSidebar({ base, orgSlug, isDashboard }: Props) {
  const [sp] = useSearchParams();
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setNewBoardOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>New Board</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <PublicBoardLink orgSlug={orgSlug} />
      <SidebarSeparator className="pb-0 mb-0" />
      <NewBoardDialog open={newBoardOpen} onOpenChange={setNewBoardOpen} />
      <ViewsNav base={base} sp={sp} isDashboard={isDashboard} />
      <SidebarSeparator />
      <WorkspaceNav base={base} orgSlug={orgSlug} />
    </SidebarContent>
  );
}
