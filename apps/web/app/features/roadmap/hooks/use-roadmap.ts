import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Post, Status } from "../types";

export function useRoadmap(initialPosts: Post[], fetchedAt: number) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["roadmap"],
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      return res.json() as Promise<{ posts: Post[] }>;
    },
    initialData: { posts: initialPosts },
    initialDataUpdatedAt: fetchedAt,
    staleTime: 30_000,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap"] }),
    onError: (err) => {
      qc.invalidateQueries({ queryKey: ["roadmap"] });
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    },
  });

  function patchGithubIssue(postId: string, issueNumber: number, issueUrl: string) {
    qc.setQueryData<{ posts: Post[] }>(["roadmap"], (old) => {
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
    patchGithubIssue,
  };
}
