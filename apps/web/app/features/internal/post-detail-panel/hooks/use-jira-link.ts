import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { JiraIssueResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useJiraLink(postId: string) {
  const [jiraLink, setJiraLink] = useState<IntegrationLink | null>(null);
  const [jiraMode, setJiraMode] = useState<"create" | "link" | null>(null);
  const [linkJiraInput, setLinkJiraInput] = useState("");

  const { mutate: createJiraIssue, isPending: creatingJiraIssue } = useMutation({
    mutationFn: async (params?: { summary?: string; description?: string; projectKey?: string }) => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_issue", postId, ...params }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return JiraIssueResultSchema.parse(json.issue);
    },
    onSuccess: (issue) => {
      setJiraLink({
        identifier: issue.key,
        externalTitle: issue.summary,
        externalStatus: issue.statusName,
        externalUrl: issue.url,
      });
      setJiraMode(null);
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkJiraIssue, isPending: linkingJiraIssue } = useMutation({
    mutationFn: async (issueKeyOrId: string) => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_issue", postId, issueKeyOrId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return JiraIssueResultSchema.parse(json.issue);
    },
    onSuccess: (issue) => {
      setJiraLink({
        identifier: issue.key,
        externalTitle: issue.summary,
        externalStatus: issue.statusName,
        externalUrl: issue.url,
      });
      setJiraMode(null);
      setLinkJiraInput("");
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkJiraIssue, isPending: unlinkingJiraIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_issue", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setJiraLink(null),
  });

  return {
    jiraLink,
    setJiraLink,
    jiraMode,
    setJiraMode,
    linkJiraInput,
    setLinkJiraInput,
    createJiraIssue,
    creatingJiraIssue,
    linkJiraIssue,
    linkingJiraIssue,
    unlinkJiraIssue,
    unlinkingJiraIssue,
  };
}
