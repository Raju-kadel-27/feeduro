import { ZendeskIcon } from "@components/icons";
import { useNavigate, useParams } from "react-router";
import type { IntegrationsLoaderData } from "../server/loader";
import { IntegrationSection } from "./integration-section";
import { IntegrationTile } from "./integration-tile";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function CustomerSupportIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { zendesk } = loaderData;

  return (
    <IntegrationSection title="Customer Support">
      <IntegrationTile
        name="Zendesk"
        icon={<ZendeskIcon size={40} />}
        connected={zendesk.connected}
        comingSoon
        onClick={() => navigate(`/${orgSlug}/settings/integrations/zendesk`)}
      />
    </IntegrationSection>
  );
}
