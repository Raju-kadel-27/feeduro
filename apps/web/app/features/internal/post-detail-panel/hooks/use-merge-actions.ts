import { type MergeSearchPost, MergeSearchResponseSchema } from "@features/feedback/schemas/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { useState } from "react";
import { toast } from "sonner";

export function useMergeActions({
  postId,
  initializedRef,
  onDataChange,
  onOpenPost,
  onClose,
}: {
  postId: string;
  initializedRef?: MutableRefObject<boolean>;
  onDataChange?: () => void;
  onOpenPost?: (id: string) => void;
  onClose?: () => void;
}) {
  const qc = useQueryClient();

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeDebounced, setMergeDebounced] = useState("");
  const [mergeStep, setMergeStep] = useState<"search" | "confirm">("search");
  const [mergeTarget, setMergeTarget] = useState<MergeSearchPost | null>(null);

  const { data: mergeSearchData, isFetching: searchingPosts } = useQuery({
    queryKey: ["merge-search", mergeDebounced, postId],
    queryFn: async () => {
      const params = new URLSearchParams({ excludePostId: postId });
      if (mergeDebounced) params.set("search", mergeDebounced);
      const res = await fetch(`/api/merge?${params}`);
      const parsed = MergeSearchResponseSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("Invalid merge results");
      return parsed.data;
    },
    enabled: mergeOpen && mergeStep === "search",
    staleTime: 0,
  });

  const { mutate: doMerge, isPending: merging } = useMutation({
    mutationFn: async ({
      sourcePostId,
      targetPostId,
    }: {
      sourcePostId: string;
      targetPostId: string;
    }) => {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "merge", sourcePostId, targetPostId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        targetPostId?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Merge failed");
      return json;
    },
    onSuccess: (_data, vars) => {
      setMergeOpen(false);
      setMergeStep("search");
      setMergeSearch("");
      setMergeTarget(null);
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Post merged successfully");
      onDataChange?.();
      if (onOpenPost) onOpenPost(vars.targetPostId!);
      else onClose?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Merge failed");
    },
  });

  const { mutate: doUnmerge, isPending: unmerging } = useMutation({
    mutationFn: async (pid: string) => {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unmerge", postId: pid }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Unmerge failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-detail", postId] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Post unmerged");
      onDataChange?.();
      if (initializedRef) initializedRef.current = false;
    },
    onError: (err: Error) => {
      toast.error(err.message || "Unmerge failed");
    },
  });

  function openMergeDialog() {
    setMergeOpen(true);
    setMergeStep("search");
    setMergeSearch("");
    setMergeTarget(null);
  }

  return {
    mergeOpen,
    setMergeOpen,
    mergeSearch,
    setMergeSearch,
    mergeDebounced,
    setMergeDebounced,
    mergeStep,
    setMergeStep,
    mergeTarget,
    setMergeTarget,
    mergeResults: mergeSearchData?.posts ?? [],
    searchingPosts,
    doMerge,
    merging,
    doUnmerge,
    unmerging,
    openMergeDialog,
  };
}
