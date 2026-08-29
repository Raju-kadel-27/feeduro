import { useAsanaLink } from "./use-asana-link";
import { useClickupLink } from "./use-clickup-link";
import { useGithubLink } from "./use-github-link";
import { useHubspotLink } from "./use-hubspot-link";
import { useJiraLink } from "./use-jira-link";
import { useLinearLink } from "./use-linear-link";
import { useMondayLink } from "./use-monday-link";
import { useNotionLink } from "./use-notion-link";
import { useSalesforceLink } from "./use-salesforce-link";
import { useShortcutLink } from "./use-shortcut-link";
import { useTrelloLink } from "./use-trello-link";
import { useZendeskLink } from "./use-zendesk-link";

export function useIntegrationLinks(postId: string) {
  const linear = useLinearLink(postId);
  const jira = useJiraLink(postId);
  const asana = useAsanaLink(postId);
  const github = useGithubLink(postId);
  const clickup = useClickupLink(postId);
  const shortcut = useShortcutLink(postId);
  const notion = useNotionLink(postId);
  const trello = useTrelloLink(postId);
  const monday = useMondayLink(postId);
  const zendesk = useZendeskLink(postId);
  const hubspot = useHubspotLink(postId);
  const salesforce = useSalesforceLink(postId);
  return { ...linear, ...jira, ...asana, ...github, ...clickup, ...shortcut, ...notion, ...trello, ...monday, ...zendesk, ...hubspot, ...salesforce };
}
