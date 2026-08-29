import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { SalesforceOpportunityResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useSalesforceLink(postId: string) {
  const [salesforceLink, setSalesforceLink] = useState<IntegrationLink | null>(null);

  const { mutate: linkSalesforceOpportunity, isPending: linkingSalesforceOpportunity } = useMutation({
    mutationFn: async (opportunityInput: string) => {
      const res = await fetch("/api/oauth2/integrations/salesforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_opportunity", postId, opportunityInput }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return SalesforceOpportunityResultSchema.parse(json.opportunity);
    },
    onSuccess: (opp) => {
      setSalesforceLink({ identifier: opp.id.slice(0, 8), externalTitle: opp.name, externalStatus: opp.stageName, externalUrl: opp.opportunityUrl });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkSalesforceOpportunity, isPending: unlinkingSalesforceOpportunity } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/salesforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_opportunity", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setSalesforceLink(null),
  });

  return {
    salesforceLink,
    setSalesforceLink,
    linkSalesforceOpportunity,
    linkingSalesforceOpportunity,
    unlinkSalesforceOpportunity,
    unlinkingSalesforceOpportunity,
  };
}
