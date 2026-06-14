import { autoCreateAsanaTask } from "@features/internal/integrations/asana/server/auto-create";
import { autoCreateClickupTask } from "@features/internal/integrations/clickup/server/auto-create";
import { autoCreateGithubIssue } from "@features/internal/integrations/github/server/auto-create";
import { autoCreateJiraIssue } from "@features/internal/integrations/jira/server/auto-create";
import { autoCreateLinearIssue } from "@features/internal/integrations/linear/server/auto-create";
import { autoCreateMondayItem } from "@features/internal/integrations/monday/server/auto-create";
import { autoCreateNotionPage } from "@features/internal/integrations/notion/server/auto-create";
import { autoCreateShortcutStory } from "@features/internal/integrations/shortcut/server/auto-create";
import { autoCreateTrelloCard } from "@features/internal/integrations/trello/server/auto-create";

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
