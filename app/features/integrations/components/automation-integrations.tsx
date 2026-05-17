import { N8nIcon, ZapierIcon } from "@components/icons";
import { useNavigate, useParams } from "react-router";
import type { IntegrationsLoaderData } from "../server/loader";
import { IntegrationSection } from "./integration-section";
import { OAuthIntegrationCard } from "./oauth-integration-card";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function AutomationIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { zapier, n8n } = loaderData;

  return (
    <IntegrationSection title="Automation">
      <OAuthIntegrationCard
        name="Zapier"
        icon={<ZapierIcon size={20} />}
        connected={zapier.connected}
        description={
          zapier.connected
            ? "Connected. Feediyo events are being forwarded to your Zaps."
            : "Forward feedback events to 7,000+ apps. Connect via a Zapier Catch Hook."
        }
        onClick={() => navigate(`/${orgSlug}/settings/integrations/zapier`)}
      />
      <OAuthIntegrationCard
        name="n8n"
        icon={<N8nIcon size={20} />}
        connected={n8n.connected}
        description={
          n8n.connected
            ? "Connected. Feediyo events are being forwarded to your n8n workflows."
            : "Trigger n8n workflows from feedback events. Connect via a Webhook node."
        }
        onClick={() => navigate(`/${orgSlug}/settings/integrations/n8n`)}
      />
    </IntegrationSection>
  );
}
