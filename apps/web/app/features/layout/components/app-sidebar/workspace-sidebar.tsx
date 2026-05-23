import { SidebarContent, SidebarSeparator } from "@components/ui/sidebar";
import { PublicBoardLink } from "./public-board-link";
import { ViewsNav } from "./views-nav";
import { WorkspaceNav } from "./workspace-nav";
import { useSearchParams } from "react-router";

type Props = { base: string; orgSlug: string; isDashboard: boolean };

export function WorkspaceSidebar({ base, orgSlug, isDashboard }: Props) {
  const [sp] = useSearchParams();
  return (
    <SidebarContent>
      <PublicBoardLink orgSlug={orgSlug} />
      <SidebarSeparator className="pb-0 mb-0" />
      <ViewsNav base={base} sp={sp} isDashboard={isDashboard} />
      <SidebarSeparator />
      <WorkspaceNav base={base} orgSlug={orgSlug} />
    </SidebarContent>
  );
}
