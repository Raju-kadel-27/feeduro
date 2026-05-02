import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { CreateWorkspaceForm } from "@components/workspace/create-workspace-form";
import { authClient } from "@lib/auth/client";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: activeOrg } = authClient.useActiveOrganization();

  const { data: orgsResult } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => authClient.organization.list(),
  });

  const orgs = orgsResult?.data ?? [];

  async function switchTo(orgId: string) {
    setOpen(false);
    await authClient.organization.setActive({ organizationId: orgId });
    const org = orgs.find((o) => o.id === orgId);
    window.location.href = org?.slug ? `/${org.slug}/dashboard` : "/dashboard";
  }

  return (
    <div className="relative">
      {/* Workspace dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
              {activeOrg?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="flex-1 truncate text-left font-medium text-[hsl(var(--sidebar-foreground))]">
              {activeOrg?.name ?? "Select workspace"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent side="right" align="start" sideOffset={8} className="w-64 p-1">
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Workspaces
          </p>

          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => switchTo(org.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                {org.name[0]?.toUpperCase()}
              </div>
              <span className="flex-1 truncate text-left">{org.name}</span>
              {activeOrg?.id === org.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}

          <div className="border-t my-1" />

          {/* New workspace — opens a separate popover to the right */}
          <Popover open={createOpen} onOpenChange={setCreateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded-md transition-colors"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-dashed">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <span>New workspace</span>
              </button>
            </PopoverTrigger>

            <PopoverContent side="right" align="start" sideOffset={8} className="w-72 p-0">
              <CreateWorkspaceForm compact autoFocus onBack={() => setCreateOpen(false)} />
            </PopoverContent>
          </Popover>
        </PopoverContent>
      </Popover>
    </div>
  );
}
