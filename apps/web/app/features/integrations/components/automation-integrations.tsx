import { N8nIcon, ZapierIcon } from "@components/icons";
import { useNavigate, useParams } from "react-router";
import type { IntegrationsLoaderData } from "../server/loader";
import { IntegrationSection } from "./integration-section";
import { IntegrationTile } from "./integration-tile";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function AutomationIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { zapier, n8n } = loaderData;

  return (
    <IntegrationSection title="Automation">
      <IntegrationTile
        name="Zapier"
        icon={<ZapierIcon size={40} />}
        connected={zapier.connected}
        comingSoon
        onClick={() => navigate(`/${orgSlug}/settings/integrations/zapier`)}
      />
      <IntegrationTile
        name="n8n"
        icon={<N8nIcon size={40} />}
        connected={n8n.connected}
        comingSoon
        onClick={() => navigate(`/${orgSlug}/settings/integrations/n8n`)}
      />
    </IntegrationSection>
  );
}
