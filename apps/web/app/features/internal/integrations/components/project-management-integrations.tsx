import { useNavigate, useParams } from "react-router";
import { IntegrationSection } from "../components/integration-section";
import { IntegrationTile } from "../components/integration-tile";
import type { IntegrationsLoaderData } from "../server/loader";
import { createProjectManagementIntegrations } from "./oauth-integrations";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function ProjectManagementIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const integrations = createProjectManagementIntegrations({
    loaderData,
    navigate,
    orgSlug: orgSlug!,
  });

  return (
    <IntegrationSection title="Project Management">
      {integrations.map((integration) => (
        <IntegrationTile
          key={integration.name}
          name={integration.name}
          icon={integration.icon}
          connected={integration.connected}
          comingSoon={integration.comingSoon}
          footer={integration.footer}
          onClick={integration.onClick}
        />
      ))}
    </IntegrationSection>
  );
}
