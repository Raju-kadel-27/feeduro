import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { LinearIssueResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useLinearLink(postId: string) {
  const [linearLink, setLinearLink] = useState<IntegrationLink | null>(null);
  const [linearMode, setLinearMode] = useState<"create" | "link" | null>(null);
  const [linkIssueInput, setLinkIssueInput] = useState("");

  const { mutate: createLinearIssue, isPending: creatingLinearIssue } = useMutation({
    mutationFn: async (params?: { title?: string; description?: string }) => {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_issue", postId, ...params }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return LinearIssueResultSchema.parse(json.issue);
    },
    onSuccess: (issue) => {
      setLinearLink({
        identifier: issue.identifier,
        externalTitle: issue.title,
        externalStatus: issue.state.name,
        externalUrl: issue.url,
      });
      setLinearMode(null);
    },
  });

  const { mutate: linkLinearIssue, isPending: linkingLinearIssue } = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_issue", postId, issueId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return LinearIssueResultSchema.parse(json.issue);
    },
    onSuccess: (issue) => {
      setLinearLink({
        identifier: issue.identifier,
        externalTitle: issue.title,
        externalStatus: issue.state.name,
        externalUrl: issue.url,
      });
      setLinearMode(null);
      setLinkIssueInput("");
    },
  });

  const { mutate: unlinkLinearIssue, isPending: unlinkingLinearIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_issue", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setLinearLink(null),
  });

  return {
    linearLink,
    setLinearLink,
    linearMode,
    setLinearMode,
    linkIssueInput,
    setLinkIssueInput,
    createLinearIssue,
    creatingLinearIssue,
    linkLinearIssue,
    linkingLinearIssue,
    unlinkLinearIssue,
    unlinkingLinearIssue,
  };
}
