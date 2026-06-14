import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import type { View } from "@features/internal/dashboard/types";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";

type Props = { base: string; orgSlug: string };

export function SavedViewsNav({ base, orgSlug }: Props) {
  const [sp] = useSearchParams();
  const activeViewId = sp.get("view");

  const { data } = useQuery<{ views: View[] }>({
    queryKey: ["views", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/views");
      return res.json();
    },
    enabled: !!orgSlug,
    staleTime: 30_000,
  });

  const views = data?.views ?? [];
  if (views.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Views</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {views.map((view) => {
            const url = `${base}/dashboard?view=${view.id}`;
            const isActive = activeViewId === view.id;
            return (
              <SidebarMenuItem key={view.id}>
                <SidebarMenuButton asChild isActive={isActive} className="text-base">
                  <Link to={url}>
                    <span>{view.emoji}</span>
                    <span className="flex-1 truncate">{view.name}</span>
                    {view.count != null && (
                      <span className="text-[11px] tabular-nums text-sidebar-foreground/50 shrink-0">
                        {view.count}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
