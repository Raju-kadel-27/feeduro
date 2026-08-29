import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { HubSpotDealResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useHubspotLink(postId: string) {
  const [hubspotLink, setHubspotLink] = useState<IntegrationLink | null>(null);

  const { mutate: linkHubspotDeal, isPending: linkingHubspotDeal } = useMutation({
    mutationFn: async (dealInput: string) => {
      const res = await fetch("/api/oauth2/integrations/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_deal", postId, dealInput }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return HubSpotDealResultSchema.parse(json.deal);
    },
    onSuccess: (deal) => {
      setHubspotLink({ identifier: deal.id, externalTitle: deal.dealname, externalStatus: deal.dealstage, externalUrl: deal.dealUrl });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkHubspotDeal, isPending: unlinkingHubspotDeal } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_deal", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setHubspotLink(null),
  });

  return {
    hubspotLink,
    setHubspotLink,
    linkHubspotDeal,
    linkingHubspotDeal,
    unlinkHubspotDeal,
    unlinkingHubspotDeal,
  };
}
