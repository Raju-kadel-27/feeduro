import { ZendeskIcon } from "@components/icons";
import { useNavigate, useParams } from "react-router";
import type { IntegrationsLoaderData } from "../server/loader";
import { IntegrationSection } from "./integration-section";
import { OAuthIntegrationCard } from "./oauth-integration-card";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function CustomerSupportIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { zendesk } = loaderData;

  const description = zendesk.connected
    ? `Connected${zendesk.accountName ? ` · ${zendesk.accountName}` : zendesk.subdomain ? ` · ${zendesk.subdomain}.zendesk.com` : ""}. Create Zendesk tickets from feedback posts.`
    : "Create Zendesk support tickets directly from feedback posts.";

  return (
    <IntegrationSection title="Customer Support">
      <OAuthIntegrationCard
        name="Zendesk"
        icon={<ZendeskIcon size={20} />}
        connected={zendesk.connected}
        description={description}
        onClick={() => navigate(`/${orgSlug}/settings/integrations/zendesk`)}
      />
    </IntegrationSection>
  );
}
