import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { ZendeskTicketResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useZendeskLink(postId: string) {
  const [zendeskLink, setZendeskLink] = useState<IntegrationLink | null>(null);

  const { mutate: linkZendeskTicket, isPending: linkingZendeskTicket } = useMutation({
    mutationFn: async (ticketInput: string) => {
      const res = await fetch("/api/oauth2/integrations/zendesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_ticket", postId, ticketInput }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return ZendeskTicketResultSchema.parse(json.ticket);
    },
    onSuccess: (ticket) => {
      setZendeskLink({ identifier: `#${ticket.id}`, externalTitle: ticket.subject, externalStatus: ticket.status, externalUrl: ticket.url });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkZendeskTicket, isPending: unlinkingZendeskTicket } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/zendesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_ticket", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setZendeskLink(null),
  });

  return {
    zendeskLink,
    setZendeskLink,
    linkZendeskTicket,
    linkingZendeskTicket,
    unlinkZendeskTicket,
    unlinkingZendeskTicket,
  };
}
