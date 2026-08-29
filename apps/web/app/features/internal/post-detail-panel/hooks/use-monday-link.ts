import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { MondayItemResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useMondayLink(postId: string) {
  const [mondayLink, setMondayLink] = useState<IntegrationLink | null>(null);

  const { mutate: createMondayItem, isPending: creatingMondayItem } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_item", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return MondayItemResultSchema.parse(json.item);
    },
    onSuccess: (item) => {
      setMondayLink({ identifier: item.id, externalTitle: item.name, externalStatus: item.groupTitle, externalUrl: item.url });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkMondayItem, isPending: linkingMondayItem } = useMutation({
    mutationFn: async (itemInput: string) => {
      const res = await fetch("/api/oauth2/integrations/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_item", postId, itemInput }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return MondayItemResultSchema.parse(json.item);
    },
    onSuccess: (item) => {
      setMondayLink({ identifier: item.id, externalTitle: item.name, externalStatus: item.groupTitle, externalUrl: item.url });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkMondayItem, isPending: unlinkingMondayItem } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_item", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setMondayLink(null),
  });

  return {
    mondayLink,
    setMondayLink,
    createMondayItem,
    creatingMondayItem,
    linkMondayItem,
    linkingMondayItem,
    unlinkMondayItem,
    unlinkingMondayItem,
  };
}
