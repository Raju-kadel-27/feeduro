import type { DetailData, PostDetail } from "@features/feedback/schemas/admin";
import { useEffect, useState } from "react";
import type { useIntegrationLinks } from "../hooks/use-integration-links";
import { CreateAsanaTaskModal } from "./create-asana-task-modal";
import { CreateJiraIssueModal } from "./create-jira-issue-modal";
import { CreateLinearIssueModal } from "./create-linear-issue-modal";
import { AsanaIcon, JiraIcon, LinearIcon, LinkedCard } from "./integration-icons";
import { LinkIssuePopover } from "./link-issue-popover";

type Integrations = ReturnType<typeof useIntegrationLinks>;

function SidebarSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

function IssueActions({ onLink, onCreate, createLabel = "Create new issue", provider, linking }: {
  onLink: (id: string) => void; onCreate: () => void; createLabel?: string;
  provider: "jira" | "linear" | "asana"; linking: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <LinkIssuePopover provider={provider} linking={linking} onLink={onLink} />
      <button type="button" onClick={onCreate} className="text-muted-foreground underline hover:text-foreground transition-colors">
        {createLabel}
      </button>
    </div>
  );
}

export function PostIntegrationSidebar({ post, detailData, integrations, isAdmin, onOpenPost }: {
  post: PostDetail; detailData: DetailData; integrations: Integrations; isAdmin: boolean;
  onOpenPost?: (id: string) => void;
}) {
  const [jiraModalOpen, setJiraModalOpen] = useState(false);
  const [linearModalOpen, setLinearModalOpen] = useState(false);
  const [asanaModalOpen, setAsanaModalOpen] = useState(false);

  const { linearMode, setLinearMode, jiraMode, setJiraMode, asanaMode, setAsanaMode } = integrations;

  // When AdminMenu sets mode to "create", open the corresponding modal
  useEffect(() => {
    if (linearMode === "create") { setLinearModalOpen(true); setLinearMode(null); }
  }, [linearMode, setLinearMode]);
  useEffect(() => {
    if (jiraMode === "create") { setJiraModalOpen(true); setJiraMode(null); }
  }, [jiraMode, setJiraMode]);
  useEffect(() => {
    if (asanaMode === "create") { setAsanaModalOpen(true); setAsanaMode(null); }
  }, [asanaMode, setAsanaMode]);

  const hasAny = detailData.linearConnected || detailData.jiraConnected || detailData.asanaConnected;
  if (!isAdmin || !hasAny) return null;

  return (
    <aside className="w-[400px] shrink-0 border-l px-4 pt-4 pb-6 space-y-5 overflow-y-auto">
      {detailData.linearConnected && (
        <SidebarSection icon={<LinearIcon size={14} />} title="Linear">
          {integrations.linearLink ? (
            <LinkedCard icon={<LinearIcon size={12} />} identifier={integrations.linearLink.identifier}
              title={integrations.linearLink.externalTitle} status={integrations.linearLink.externalStatus}
              url={integrations.linearLink.externalUrl} accentColor="#5E6AD2"
              onUnlink={integrations.unlinkLinearIssue} unlinking={integrations.unlinkingLinearIssue} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="linear" linking={integrations.linkingLinearIssue}
              onLink={(id) => integrations.linkLinearIssue(id)}
              onCreate={() => setLinearModalOpen(true)} />
          )}
        </SidebarSection>
      )}

      {detailData.jiraConnected && (
        <SidebarSection icon={<JiraIcon size={14} />} title="Jira">
          {integrations.jiraLink ? (
            <LinkedCard icon={<JiraIcon size={12} />} identifier={integrations.jiraLink.identifier}
              title={integrations.jiraLink.externalTitle} status={integrations.jiraLink.externalStatus}
              url={integrations.jiraLink.externalUrl} accentColor="#2684FF"
              onUnlink={integrations.unlinkJiraIssue} unlinking={integrations.unlinkingJiraIssue} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="jira" linking={integrations.linkingJiraIssue}
              onLink={(id) => integrations.linkJiraIssue(id)}
              onCreate={() => setJiraModalOpen(true)} />
          )}
        </SidebarSection>
      )}

      {detailData.asanaConnected && (
        <SidebarSection icon={<AsanaIcon size={14} />} title="Asana">
          {integrations.asanaLink ? (
            <LinkedCard icon={<AsanaIcon size={12} />} identifier={integrations.asanaLink.externalTitle ?? integrations.asanaLink.identifier}
              title={null} status={integrations.asanaLink.externalStatus} url={integrations.asanaLink.externalUrl}
              accentColor="#F06A6A" onUnlink={integrations.unlinkAsanaTask}
              unlinking={integrations.unlinkingAsanaTask} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="asana" linking={integrations.linkingAsanaTask}
              onLink={(id) => integrations.linkAsanaTask(id)}
              onCreate={() => setAsanaModalOpen(true)} createLabel="Create new task" />
          )}
        </SidebarSection>
      )}

      <CreateJiraIssueModal open={jiraModalOpen} defaultSummary={post.title} defaultDescription={post.description ?? ""}
        onClose={() => setJiraModalOpen(false)} creating={integrations.creatingJiraIssue}
        onSubmit={(p) => { integrations.createJiraIssue(p); setJiraModalOpen(false); }} />
      <CreateLinearIssueModal open={linearModalOpen} defaultTitle={post.title} defaultDescription={post.description ?? ""}
        onClose={() => setLinearModalOpen(false)} creating={integrations.creatingLinearIssue}
        onSubmit={(p) => { integrations.createLinearIssue(p); setLinearModalOpen(false); }} />
      <CreateAsanaTaskModal open={asanaModalOpen} defaultName={post.title} defaultNotes={post.description ?? ""}
        onClose={() => setAsanaModalOpen(false)} creating={integrations.creatingAsanaTask}
        onSubmit={(p) => { integrations.createAsanaTask(p); setAsanaModalOpen(false); }} />

    </aside>
  );
}
