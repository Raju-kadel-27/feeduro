import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { TrelloCardResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useTrelloLink(postId: string) {
  const [trelloLink, setTrelloLink] = useState<IntegrationLink | null>(null);

  const { mutate: createTrelloCard, isPending: creatingTrelloCard } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_card", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return TrelloCardResultSchema.parse(json.card);
    },
    onSuccess: (card) => {
      setTrelloLink({ identifier: card.id, externalTitle: card.name, externalStatus: card.listName ?? null, externalUrl: card.url });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkTrelloCard, isPending: linkingTrelloCard } = useMutation({
    mutationFn: async (cardInput: string) => {
      const res = await fetch("/api/oauth2/integrations/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_card", postId, cardInput }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return TrelloCardResultSchema.parse(json.card);
    },
    onSuccess: (card) => {
      setTrelloLink({ identifier: card.id, externalTitle: card.name, externalStatus: card.listName ?? null, externalUrl: card.url });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkTrelloCard, isPending: unlinkingTrelloCard } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_card", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setTrelloLink(null),
  });

  return {
    trelloLink,
    setTrelloLink,
    createTrelloCard,
    creatingTrelloCard,
    linkTrelloCard,
    linkingTrelloCard,
    unlinkTrelloCard,
    unlinkingTrelloCard,
  };
}
