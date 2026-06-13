import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar";
import type { Post } from "@features/dashboard/types";
import { COLUMNS } from "@features/roadmap/constants";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

type Props = { base: string; sp: URLSearchParams; isDashboard: boolean };

export function ViewsNav({ base, sp, isDashboard }: Props) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  // Optimistic selected statuses — updated instantly on click, synced from URL when navigation settles
  const [optimisticStatuses, setOptimisticStatuses] = useState<string[]>(() => sp.getAll("status"));
  const spKey = sp.toString();
  useEffect(() => {
    setOptimisticStatuses(sp.getAll("status"));
  }, [spKey]);

  function toggle(colId: string) {
    const next = optimisticStatuses.includes(colId)
      ? optimisticStatuses.filter((s) => s !== colId)
      : [...optimisticStatuses, colId];
    setOptimisticStatuses(next);
    // Build URL from next optimistic state so rapid clicks don't desync
    const params = new URLSearchParams(sp.toString());
    params.delete("status");
    for (const s of next) params.append("status", s);
    const qs = params.toString();
    navigate(`${base}/dashboard${qs ? `?${qs}` : ""}`, { replace: isDashboard });
  }

  const { data: postsData } = useQuery({
    queryKey: ["feedback", "all", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      return res.json() as Promise<{ posts: Post[] }>;
    },
    staleTime: 30_000,
  });

  const statusCounts = useMemo(() => {
    const posts = postsData?.posts ?? [];
    return posts.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [postsData]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold">
        Status
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {COLUMNS.map((col) => {
            const isActive = isDashboard && optimisticStatuses.includes(col.id);
            const Icon = col.icon;
            const count = statusCounts[col.id];
            return (
              <SidebarMenuItem key={col.id}>
                <SidebarMenuButton
                  isActive={isActive}
                  className="text-sm"
                  onClick={() => toggle(col.id)}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${col.dot.replace("bg-", "text-")} ${isActive ? "opacity-100 scale-110" : "opacity-40"}`}
                  />
                  <span className="flex-1">{col.label}</span>
                  {isActive ? (
                    <Check
                      className="h-3 w-3 shrink-0 opacity-60"
                      strokeWidth={2.5}
                    />
                  ) : count != null ? (
                    <span className="text-xs font-medium tabular-nums text-muted-foreground/70 min-w-[1.25rem] text-right">
                      {count}
                    </span>
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
