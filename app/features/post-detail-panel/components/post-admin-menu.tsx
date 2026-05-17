import { GitMerge, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import type { useIntegrationLinks } from "../hooks/use-integration-links";
import { AsanaIcon, JiraIcon, LinearIcon } from "./integration-icons";
import { IntegrationMenuItem } from "./integration-menu-item";

type Integrations = ReturnType<typeof useIntegrationLinks>;

export function AdminMenu({
  orgSlug,
  hasMergedInto,
  integrations,
  onMergeOpen,
  onClose,
}: {
  orgSlug: string;
  hasMergedInto: boolean;
  integrations: Integrations;
  onMergeOpen: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border bg-popover shadow-lg py-1">
            {!hasMergedInto && (
              <button
                type="button"
                onClick={() => { setOpen(false); onMergeOpen(); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                <GitMerge className="h-3.5 w-3.5" />
                Merge post
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-destructive hover:bg-muted transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete post
            </button>
            <div className="border-t my-1" />
            <p className="px-3 pt-0.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Integrations
            </p>
            <IntegrationMenuItem
              icon={<LinearIcon size={12} />}
              link={integrations.linearLink}
              connectLabel="Connect Linear"
              connectTo={`/${orgSlug}/settings/integrations/linear`}
              accentColor="#5E6AD2"
              onLink={() => { integrations.setLinearMode("create"); setOpen(false); }}
              onUnlink={() => { integrations.unlinkLinearIssue(); setOpen(false); }}
              unlinking={integrations.unlinkingLinearIssue}
              onClose={() => { setOpen(false); onClose(); }}
            />
            <IntegrationMenuItem
              icon={<JiraIcon size={12} />}
              link={integrations.jiraLink}
              connectLabel="Connect Jira"
              connectTo={`/${orgSlug}/settings/integrations/jira`}
              accentColor="#2684FF"
              onLink={() => { integrations.setJiraMode("create"); setOpen(false); }}
              onUnlink={() => { integrations.unlinkJiraIssue(); setOpen(false); }}
              unlinking={integrations.unlinkingJiraIssue}
              onClose={() => { setOpen(false); onClose(); }}
            />
            <IntegrationMenuItem
              icon={<AsanaIcon size={12} />}
              link={integrations.asanaLink}
              connectLabel="Connect Asana"
              connectTo={`/${orgSlug}/settings/integrations/asana`}
              accentColor="#F06A6A"
              onLink={() => { integrations.setAsanaMode("create"); setOpen(false); }}
              onUnlink={() => { integrations.unlinkAsanaTask(); setOpen(false); }}
              unlinking={integrations.unlinkingAsanaTask}
              onClose={() => { setOpen(false); onClose(); }}
            />
          </div>
        </>
      )}
    </div>
  );
}
