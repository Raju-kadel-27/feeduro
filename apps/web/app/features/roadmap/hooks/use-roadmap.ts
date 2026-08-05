import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Post, Status } from "../types";

export function useRoadmap(initialPosts: Post[], fetchedAt: number, orgSlug: string) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["roadmap", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      return res.json() as Promise<{ posts: Post[] }>;
    },
    initialData: { posts: initialPosts },
    initialDataUpdatedAt: fetchedAt,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_status", id, status }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: (_, { id, status }) => {
      qc.setQueryData<{ posts: Post[] }>(["roadmap", orgSlug], (old) => {
        if (!old) return old;
        return { posts: old.posts.map((p) => (p.id === id ? { ...p, status } : p)) };
      });
    },
    onError: (err) => {
      qc.invalidateQueries({ queryKey: ["roadmap", orgSlug] });
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    },
  });

  const { mutate: updateRank } = useMutation({
    mutationFn: async ({ status, orderedIds }: { status: Status; orderedIds: string[] }) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_rank", status, orderedIds }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: (_, { orderedIds }) => {
      qc.setQueryData<{ posts: Post[] }>(["roadmap", orgSlug], (old) => {
        if (!old) return old;
        const rankMap = new Map(orderedIds.map((id, i) => [id, i]));
        return {
          posts: old.posts.map((p) => (rankMap.has(p.id) ? { ...p, rank: rankMap.get(p.id) } : p)),
        };
      });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["roadmap", orgSlug] });
    },
  });

  function patchGithubIssue(postId: string, issueNumber: number, issueUrl: string) {
    qc.setQueryData<{ posts: Post[] }>(["roadmap", orgSlug], (old) => {
      if (!old) return old;
      return {
        posts: old.posts.map((p) =>
          p.id === postId ? { ...p, githubIssueNumber: issueNumber, githubIssueUrl: issueUrl } : p,
        ),
      };
    });
  }

  return {
    posts: data?.posts ?? [],
    isLoading,
    updateStatus,
    updateRank,
    patchGithubIssue,
  };
}
