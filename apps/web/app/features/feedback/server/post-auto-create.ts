import { autoCreateAsanaTask } from "@features/integrations/asana/server/auto-create";
import { autoCreateClickupTask } from "@features/integrations/clickup/server/auto-create";
import { autoCreateGithubIssue } from "@features/integrations/github/server/auto-create";
import { autoCreateJiraIssue } from "@features/integrations/jira/server/auto-create";
import { autoCreateLinearIssue } from "@features/integrations/linear/server/auto-create";
import { autoCreateMondayItem } from "@features/integrations/monday/server/auto-create";
import { autoCreateNotionPage } from "@features/integrations/notion/server/auto-create";
import { autoCreateShortcutStory } from "@features/integrations/shortcut/server/auto-create";
import { autoCreateTrelloCard } from "@features/integrations/trello/server/auto-create";

type PostRef = { id: string; title: string; description: string | null };

export function fireAutoCreateIntegrations(
  organizationId: string,
  post: PostRef,
  userId: string,
): void {
  autoCreateGithubIssue(organizationId, post, userId).catch((err) =>
    console.error("[github-auto-create]", err),
  );
  autoCreateJiraIssue(organizationId, post, userId).catch((err) =>
    console.error("[jira-auto-create]", err),
  );
  autoCreateAsanaTask(organizationId, post, userId).catch((err) =>
    console.error("[asana-auto-create]", err),
  );
  autoCreateShortcutStory(organizationId, post, userId).catch((err) =>
    console.error("[shortcut-auto-create]", err),
  );
  autoCreateTrelloCard(organizationId, post, userId).catch((err) =>
    console.error("[trello-auto-create]", err),
  );
  autoCreateNotionPage(organizationId, post, userId).catch((err) =>
    console.error("[notion-auto-create]", err),
  );
  autoCreateLinearIssue(organizationId, post, userId).catch((err) =>
    console.error("[linear-auto-create]", err),
  );
  autoCreateMondayItem(organizationId, post, userId).catch((err) =>
    console.error("[monday-auto-create]", err),
  );
  autoCreateClickupTask(organizationId, post, userId).catch((err) =>
    console.error("[clickup-auto-create]", err),
  );
}
