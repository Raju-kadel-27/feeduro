import type { OrgMember } from "@features/feedback/schemas/admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useOwnerPicker(postId: string, onDataChange: () => void) {
  const qc = useQueryClient();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerImage, setOwnerImage] = useState<string | null>(null);
  const [orgAdmins, setOrgAdmins] = useState<OrgMember[]>([]);

  const { mutate: assignOwner, isPending: assigning } = useMutation({
    mutationFn: async (newOwnerId: string | null) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "assign_owner", id: postId, ownerId: newOwnerId }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to assign owner");
      }
    },
    onMutate: (newOwnerId) => {
      const member = orgAdmins.find((m) => m.id === newOwnerId) ?? null;
      setOwnerId(newOwnerId);
      setOwnerName(member?.name ?? null);
      setOwnerImage(member?.image ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-detail", postId] });
      qc.invalidateQueries({ queryKey: ["activities", postId] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
      onDataChange();
    },
  });

  return {
    ownerId,
    ownerName,
    ownerImage,
    orgAdmins,
    assigning,
    setOwnerId,
    setOwnerName,
    setOwnerImage,
    setOrgAdmins,
    assignOwner,
  };
}
