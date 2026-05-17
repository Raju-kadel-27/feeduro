import { useAsanaLink } from "./use-asana-link";
import { useJiraLink } from "./use-jira-link";
import { useLinearLink } from "./use-linear-link";

export function useIntegrationLinks(postId: string) {
  const linear = useLinearLink(postId);
  const jira = useJiraLink(postId);
  const asana = useAsanaLink(postId);
  return { ...linear, ...jira, ...asana };
}
