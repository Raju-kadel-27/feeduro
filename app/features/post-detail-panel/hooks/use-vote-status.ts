import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { AdminStatus } from "@features/feedback/schemas/admin";

export function useVoteStatus(postId: string, onDataChange: () => void) {
  const qc = useQueryClient();

  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [status, setStatus] = useState<AdminStatus>("open");

  const { mutate: toggleVote, isPending: voting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      return res.json() as Promise<{ voted: boolean }>;
    },
    onMutate: () => {
      setHasVoted((v) => !v);
      setVoteCount((c) => (hasVoted ? c - 1 : c + 1));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      onDataChange();
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async (newStatus: AdminStatus) => {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_status", id: postId, status: newStatus }),
      });
    },
    onMutate: (newStatus) => setStatus(newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      qc.invalidateQueries({ queryKey: ["activities", postId] });
      onDataChange();
    },
  });

  return { voteCount, setVoteCount, hasVoted, setHasVoted, status, setStatus, toggleVote, voting, updateStatus };
}
