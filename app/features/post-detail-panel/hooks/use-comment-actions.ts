import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useCommentActions(postId: string, onDataChange: () => void) {
  const qc = useQueryClient();

  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string | null>(null);

  const { mutate: createComment, isPending: creating } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create", postId, body: newComment.trim(), isInternal }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      setIsInternal(false);
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
      onDataChange();
    },
  });

  const { mutate: createReply, isPending: replying } = useMutation({
    mutationFn: async ({ parentId, body }: { parentId: string; body: string }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "reply", postId, parentId, body }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      setReplyingTo(null);
      setReplyBodies((prev) => { const next = { ...prev }; delete next[vars.parentId]; return next; });
      qc.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", commentId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
      onDataChange();
    },
  });

  const { mutate: generateSummary, isPending: generatingSummary } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comment-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const json = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to generate summary");
      return json.summary!;
    },
    onSuccess: (text) => {
      setSummary(text);
      setSummaryGeneratedAt(new Date().toISOString());
    },
  });

  return {
    newComment, setNewComment, isInternal, setIsInternal,
    replyingTo, setReplyingTo, replyBodies, setReplyBodies,
    summary, setSummary, summaryGeneratedAt, setSummaryGeneratedAt,
    createComment, creating, createReply, replying, deleteComment, generateSummary, generatingSummary,
  };
}
