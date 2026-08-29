import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { GithubIssueResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useGithubLink(postId: string) {
  const [githubLink, setGithubLink] = useState<IntegrationLink | null>(null);
  const [githubMode, setGithubMode] = useState<"create" | "link" | null>(null);
  const [linkGithubInput, setLinkGithubInput] = useState("");

  const { mutate: createGithubIssue, isPending: creatingGithubIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_issue", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return GithubIssueResultSchema.parse(json.issue);
    },
    onSuccess: (issue) => {
      setGithubLink({
        identifier: `#${issue.number}`,
        externalTitle: issue.title,
        externalStatus: issue.state,
        externalUrl: issue.html_url,
      });
      setGithubMode(null);
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkGithubIssue, isPending: linkingGithubIssue } = useMutation({
    mutationFn: async (issueUrl: string) => {
      const res = await fetch("/api/oauth2/integrations/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_issue", postId, issueUrl }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return GithubIssueResultSchema.parse(json.issue);
    },
    onSuccess: (issue) => {
      setGithubLink({
        identifier: `#${issue.number}`,
        externalTitle: issue.title,
        externalStatus: issue.state,
        externalUrl: issue.html_url,
      });
      setGithubMode(null);
      setLinkGithubInput("");
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkGithubIssue, isPending: unlinkingGithubIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_issue", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setGithubLink(null),
  });

  return {
    githubLink,
    setGithubLink,
    githubMode,
    setGithubMode,
    linkGithubInput,
    setLinkGithubInput,
    createGithubIssue,
    creatingGithubIssue,
    linkGithubIssue,
    linkingGithubIssue,
    unlinkGithubIssue,
    unlinkingGithubIssue,
  };
}
