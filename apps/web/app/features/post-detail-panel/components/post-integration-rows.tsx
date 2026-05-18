import type { useIntegrationLinks } from "../hooks/use-integration-links";
import { IntegrationFormRow } from "./integration-form-row";
import { AsanaIcon, JiraIcon, LinearIcon, LinkedCard } from "./integration-icons";

type Integrations = ReturnType<typeof useIntegrationLinks>;

export function IntegrationRows({
  integrations,
  isAdmin,
}: {
  integrations: Integrations;
  isAdmin: boolean;
}) {
  const hasAny =
    integrations.linearLink ||
    integrations.linearMode ||
    integrations.jiraLink ||
    integrations.jiraMode ||
    integrations.asanaLink ||
    integrations.asanaMode;

  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-2 text-xs">
      {(integrations.linearLink || integrations.linearMode) && (
        <>
          <span className="text-muted-foreground self-center">Linear</span>
          <div className="min-w-0">
            {integrations.linearLink ? (
              <LinkedCard
                icon={<LinearIcon size={12} />}
                identifier={integrations.linearLink.identifier}
                title={integrations.linearLink.externalTitle}
                status={integrations.linearLink.externalStatus}
                url={integrations.linearLink.externalUrl}
                accentColor="#5E6AD2"
                onUnlink={integrations.unlinkLinearIssue}
                unlinking={integrations.unlinkingLinearIssue}
                isAdmin={isAdmin}
              />
            ) : (
              <IntegrationFormRow
                mode={integrations.linearMode!}
                input={integrations.linkIssueInput}
                placeholder="ENG-123 or issue ID"
                accentColor="#5E6AD2"
                creating={integrations.creatingLinearIssue}
                linking={integrations.linkingLinearIssue}
                onInputChange={integrations.setLinkIssueInput}
                onCreate={() => integrations.createLinearIssue()}
                onLink={() => integrations.linkLinearIssue(integrations.linkIssueInput.trim())}
                onSwitchToLink={() => integrations.setLinearMode("link")}
                onCancel={() => {
                  integrations.setLinearMode(null);
                  integrations.setLinkIssueInput("");
                }}
              />
            )}
          </div>
        </>
      )}
      {(integrations.jiraLink || integrations.jiraMode) && (
        <>
          <span className="text-muted-foreground self-center">Jira</span>
          <div className="min-w-0">
            {integrations.jiraLink ? (
              <LinkedCard
                icon={<JiraIcon size={12} />}
                identifier={integrations.jiraLink.identifier}
                title={integrations.jiraLink.externalTitle}
                status={integrations.jiraLink.externalStatus}
                url={integrations.jiraLink.externalUrl}
                accentColor="#2684FF"
                onUnlink={integrations.unlinkJiraIssue}
                unlinking={integrations.unlinkingJiraIssue}
                isAdmin={isAdmin}
              />
            ) : (
              <IntegrationFormRow
                mode={integrations.jiraMode!}
                input={integrations.linkJiraInput}
                placeholder="PROJ-42"
                accentColor="#2684FF"
                creating={integrations.creatingJiraIssue}
                linking={integrations.linkingJiraIssue}
                onInputChange={integrations.setLinkJiraInput}
                onCreate={() => integrations.createJiraIssue()}
                onLink={() => integrations.linkJiraIssue(integrations.linkJiraInput.trim())}
                onSwitchToLink={() => integrations.setJiraMode("link")}
                onCancel={() => {
                  integrations.setJiraMode(null);
                  integrations.setLinkJiraInput("");
                }}
              />
            )}
          </div>
        </>
      )}
      {(integrations.asanaLink || integrations.asanaMode) && (
        <>
          <span className="text-muted-foreground self-center">Asana</span>
          <div className="min-w-0">
            {integrations.asanaLink ? (
              <LinkedCard
                icon={<AsanaIcon size={12} />}
                identifier={
                  integrations.asanaLink.externalTitle ?? integrations.asanaLink.identifier
                }
                title={null}
                status={integrations.asanaLink.externalStatus}
                url={integrations.asanaLink.externalUrl}
                accentColor="#F06A6A"
                onUnlink={integrations.unlinkAsanaTask}
                unlinking={integrations.unlinkingAsanaTask}
                isAdmin={isAdmin}
              />
            ) : (
              <IntegrationFormRow
                mode={integrations.asanaMode!}
                input={integrations.linkAsanaInput}
                placeholder="Task GID or URL"
                accentColor="#F06A6A"
                creating={integrations.creatingAsanaTask}
                linking={integrations.linkingAsanaTask}
                onInputChange={integrations.setLinkAsanaInput}
                onCreate={() => integrations.createAsanaTask()}
                onLink={() => integrations.linkAsanaTask(integrations.linkAsanaInput.trim())}
                onSwitchToLink={() => integrations.setAsanaMode("link")}
                onCancel={() => {
                  integrations.setAsanaMode(null);
                  integrations.setLinkAsanaInput("");
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
