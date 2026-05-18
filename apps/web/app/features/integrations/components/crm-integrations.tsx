import { HubSpotIcon, SalesforceIcon } from "@components/icons";
import { useNavigate, useParams } from "react-router";
import type { IntegrationsLoaderData } from "../server/loader";
import { IntegrationSection } from "./integration-section";
import { OAuthIntegrationCard } from "./oauth-integration-card";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function CrmIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { hubspot, salesforce } = loaderData;

  const hubspotDescription = hubspot.connected
    ? `Connected${hubspot.hubDomain ? ` · ${hubspot.hubDomain}` : hubspot.portalId ? ` · Portal ${hubspot.portalId}` : ""}. Link deals and contacts to feedback posts.`
    : "Link HubSpot deals and contacts to feedback posts. Track revenue opportunity.";

  const salesforceDescription = salesforce.connected
    ? `Connected${salesforce.displayName ? ` · ${salesforce.displayName}` : salesforce.instanceUrl ? ` · ${salesforce.instanceUrl.replace("https://", "")}` : ""}. Capture feedback from cases, contacts, and opportunities.`
    : "Capture feedback from cases, contacts, leads, and opportunities. Track opportunity value.";

  return (
    <IntegrationSection title="CRM">
      <OAuthIntegrationCard
        name="Salesforce"
        icon={<SalesforceIcon size={20} />}
        connected={salesforce.connected}
        description={salesforceDescription}
        onClick={() => navigate(`/${orgSlug}/settings/integrations/salesforce`)}
      />
      <OAuthIntegrationCard
        name="HubSpot"
        icon={<HubSpotIcon size={20} />}
        connected={hubspot.connected}
        description={hubspotDescription}
        onClick={() => navigate(`/${orgSlug}/settings/integrations/hubspot`)}
      />
    </IntegrationSection>
  );
}
