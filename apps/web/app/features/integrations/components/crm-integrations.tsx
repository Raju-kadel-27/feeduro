import { HubSpotIcon, SalesforceIcon } from "@components/icons";
import { useNavigate, useParams } from "react-router";
import type { IntegrationsLoaderData } from "../server/loader";
import { IntegrationSection } from "./integration-section";
import { IntegrationTile } from "./integration-tile";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function CrmIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { hubspot, salesforce } = loaderData;

  return (
    <IntegrationSection title="CRM">
      <IntegrationTile
        name="Salesforce"
        icon={<SalesforceIcon size={40} />}
        connected={salesforce.connected}
        onClick={() => navigate(`/${orgSlug}/settings/integrations/salesforce`)}
      />
      <IntegrationTile
        name="HubSpot"
        icon={<HubSpotIcon size={40} />}
        connected={hubspot.connected}
        onClick={() => navigate(`/${orgSlug}/settings/integrations/hubspot`)}
      />
    </IntegrationSection>
  );
}
