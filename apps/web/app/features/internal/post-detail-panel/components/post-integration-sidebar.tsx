import type { DetailData, PostDetail } from "@features/feedback/schemas/admin";
import { useEffect, useState } from "react";
import type { useIntegrationLinks } from "../hooks/use-integration-links";
import { CreateAsanaTaskModal } from "./create-asana-task-modal";
import { CreateJiraIssueModal } from "./create-jira-issue-modal";
import { CreateLinearIssueModal } from "./create-linear-issue-modal";
import {
  AsanaIcon,
  ClickupIcon,
  GithubIcon,
  HubSpotIcon,
  JiraIcon,
  LinearIcon,
  LinkedCard,
  MondayIcon,
  NotionIcon,
  SalesforceIcon,
  ShortcutIcon,
  TrelloIcon,
  ZendeskIcon,
} from "./integration-icons";
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

function IssueActions({ onLink, onCreate, createLabel, provider, linking }: {
  onLink: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  provider: React.ComponentProps<typeof LinkIssuePopover>["provider"];
  linking: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <LinkIssuePopover provider={provider} linking={linking} onLink={onLink} />
      {onCreate && (
        <button type="button" onClick={onCreate} className="text-muted-foreground underline hover:text-foreground transition-colors">
          {createLabel ?? "Create new issue"}
        </button>
      )}
    </div>
  );
}

/** Inner content without the <aside> wrapper — reusable in other sidebars. */
export function IntegrationSections({ post, detailData, integrations, isAdmin }: {
  post: PostDetail; detailData: DetailData; integrations: Integrations; isAdmin: boolean;
}) {
  const [jiraModalOpen, setJiraModalOpen] = useState(false);
  const [linearModalOpen, setLinearModalOpen] = useState(false);
  const [asanaModalOpen, setAsanaModalOpen] = useState(false);

  const { linearMode, setLinearMode, jiraMode, setJiraMode, asanaMode, setAsanaMode } = integrations;

  useEffect(() => {
    if (linearMode === "create") { setLinearModalOpen(true); setLinearMode(null); }
  }, [linearMode, setLinearMode]);
  useEffect(() => {
    if (jiraMode === "create") { setJiraModalOpen(true); setJiraMode(null); }
  }, [jiraMode, setJiraMode]);
  useEffect(() => {
    if (asanaMode === "create") { setAsanaModalOpen(true); setAsanaMode(null); }
  }, [asanaMode, setAsanaMode]);

  return (
    <>
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

      {detailData.githubConnected && (
        <SidebarSection icon={<GithubIcon size={14} />} title="GitHub">
          {integrations.githubLink ? (
            <LinkedCard icon={<GithubIcon size={12} />} identifier={integrations.githubLink.identifier}
              title={integrations.githubLink.externalTitle} status={integrations.githubLink.externalStatus}
              url={integrations.githubLink.externalUrl} accentColor="#24292f"
              onUnlink={integrations.unlinkGithubIssue} unlinking={integrations.unlinkingGithubIssue} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="github" linking={integrations.linkingGithubIssue}
              onLink={(url) => integrations.linkGithubIssue(url)}
              onCreate={() => integrations.createGithubIssue()} />
          )}
        </SidebarSection>
      )}

      {detailData.shortcutConnected && (
        <SidebarSection icon={<ShortcutIcon size={14} />} title="Shortcut">
          {integrations.shortcutLink ? (
            <LinkedCard icon={<ShortcutIcon size={12} />} identifier={integrations.shortcutLink.identifier}
              title={integrations.shortcutLink.externalTitle} status={integrations.shortcutLink.externalStatus}
              url={integrations.shortcutLink.externalUrl} accentColor="#45474D"
              onUnlink={integrations.unlinkShortcutStory} unlinking={integrations.unlinkingShortcutStory} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="shortcut" linking={integrations.linkingShortcutStory}
              onLink={(id) => integrations.linkShortcutStory(id)}
              onCreate={() => integrations.createShortcutStory()} createLabel="Create new story" />
          )}
        </SidebarSection>
      )}

      {detailData.clickupConnected && (
        <SidebarSection icon={<ClickupIcon size={14} />} title="ClickUp">
          {integrations.clickupLink ? (
            <LinkedCard icon={<ClickupIcon size={12} />} identifier={integrations.clickupLink.identifier}
              title={integrations.clickupLink.externalTitle} status={integrations.clickupLink.externalStatus}
              url={integrations.clickupLink.externalUrl} accentColor="#7B68EE"
              onUnlink={integrations.unlinkClickupTask} unlinking={integrations.unlinkingClickupTask} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="clickup" linking={integrations.linkingClickupTask}
              onLink={(id) => integrations.linkClickupTask(id)}
              onCreate={() => integrations.createClickupTask()} createLabel="Create new task" />
          )}
        </SidebarSection>
      )}

      {detailData.notionConnected && (
        <SidebarSection icon={<NotionIcon size={14} />} title="Notion">
          {integrations.notionLink ? (
            <LinkedCard icon={<NotionIcon size={12} />} identifier={integrations.notionLink.identifier}
              title={integrations.notionLink.externalTitle} status={null}
              url={integrations.notionLink.externalUrl} accentColor="#000"
              onUnlink={integrations.unlinkNotionPage} unlinking={integrations.unlinkingNotionPage} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="notion" linking={integrations.linkingNotionPage}
              onLink={(id) => integrations.linkNotionPage(id)}
              onCreate={() => integrations.createNotionPage()} createLabel="Create new page" />
          )}
        </SidebarSection>
      )}

      {detailData.trelloConnected && (
        <SidebarSection icon={<TrelloIcon size={14} />} title="Trello">
          {integrations.trelloLink ? (
            <LinkedCard icon={<TrelloIcon size={12} />} identifier={integrations.trelloLink.identifier}
              title={integrations.trelloLink.externalTitle} status={integrations.trelloLink.externalStatus}
              url={integrations.trelloLink.externalUrl} accentColor="#0079BF"
              onUnlink={integrations.unlinkTrelloCard} unlinking={integrations.unlinkingTrelloCard} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="trello" linking={integrations.linkingTrelloCard}
              onLink={(id) => integrations.linkTrelloCard(id)}
              onCreate={() => integrations.createTrelloCard()} createLabel="Create new card" />
          )}
        </SidebarSection>
      )}

      {detailData.mondayConnected && (
        <SidebarSection icon={<MondayIcon size={14} />} title="Monday.com">
          {integrations.mondayLink ? (
            <LinkedCard icon={<MondayIcon size={12} />} identifier={integrations.mondayLink.identifier}
              title={integrations.mondayLink.externalTitle} status={integrations.mondayLink.externalStatus}
              url={integrations.mondayLink.externalUrl} accentColor="#FF3D57"
              onUnlink={integrations.unlinkMondayItem} unlinking={integrations.unlinkingMondayItem} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="monday" linking={integrations.linkingMondayItem}
              onLink={(id) => integrations.linkMondayItem(id)}
              onCreate={() => integrations.createMondayItem()} createLabel="Create new item" />
          )}
        </SidebarSection>
      )}

      {detailData.zendeskConnected && (
        <SidebarSection icon={<ZendeskIcon size={14} />} title="Zendesk">
          {integrations.zendeskLink ? (
            <LinkedCard icon={<ZendeskIcon size={12} />} identifier={integrations.zendeskLink.identifier}
              title={integrations.zendeskLink.externalTitle} status={integrations.zendeskLink.externalStatus}
              url={integrations.zendeskLink.externalUrl} accentColor="#1F73B7"
              onUnlink={integrations.unlinkZendeskTicket} unlinking={integrations.unlinkingZendeskTicket} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="zendesk" linking={integrations.linkingZendeskTicket}
              onLink={(id) => integrations.linkZendeskTicket(id)} />
          )}
        </SidebarSection>
      )}

      {detailData.hubspotConnected && (
        <SidebarSection icon={<HubSpotIcon size={14} />} title="HubSpot">
          {integrations.hubspotLink ? (
            <LinkedCard icon={<HubSpotIcon size={12} />} identifier={integrations.hubspotLink.identifier}
              title={integrations.hubspotLink.externalTitle} status={integrations.hubspotLink.externalStatus}
              url={integrations.hubspotLink.externalUrl} accentColor="#FF5C35"
              onUnlink={integrations.unlinkHubspotDeal} unlinking={integrations.unlinkingHubspotDeal} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="hubspot" linking={integrations.linkingHubspotDeal}
              onLink={(id) => integrations.linkHubspotDeal(id)} />
          )}
        </SidebarSection>
      )}

      {detailData.salesforceConnected && (
        <SidebarSection icon={<SalesforceIcon size={14} />} title="Salesforce">
          {integrations.salesforceLink ? (
            <LinkedCard icon={<SalesforceIcon size={12} />} identifier={integrations.salesforceLink.identifier}
              title={integrations.salesforceLink.externalTitle} status={integrations.salesforceLink.externalStatus}
              url={integrations.salesforceLink.externalUrl} accentColor="#00A1E0"
              onUnlink={integrations.unlinkSalesforceOpportunity} unlinking={integrations.unlinkingSalesforceOpportunity} isAdmin={isAdmin} />
          ) : (
            <IssueActions provider="salesforce" linking={integrations.linkingSalesforceOpportunity}
              onLink={(id) => integrations.linkSalesforceOpportunity(id)} />
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
    </>
  );
}

export function PostIntegrationSidebar({ post, detailData, integrations, isAdmin, onOpenPost }: {
  post: PostDetail; detailData: DetailData; integrations: Integrations; isAdmin: boolean;
  onOpenPost?: (id: string) => void;
}) {
  const hasAny =
    detailData.linearConnected || detailData.jiraConnected || detailData.asanaConnected ||
    detailData.githubConnected || detailData.clickupConnected || detailData.shortcutConnected ||
    detailData.notionConnected || detailData.trelloConnected || detailData.mondayConnected ||
    detailData.zendeskConnected || detailData.hubspotConnected || detailData.salesforceConnected;
  if (!isAdmin || !hasAny) return null;
  return (
    <aside className="w-[400px] shrink-0 border-l px-4 pt-4 pb-6 space-y-5 overflow-y-auto">
      <IntegrationSections post={post} detailData={detailData} integrations={integrations} isAdmin={isAdmin} />
    </aside>
  );
}
