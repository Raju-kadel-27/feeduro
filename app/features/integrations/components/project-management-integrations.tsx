import { useNavigate, useParams } from "react-router";
import { OAuthIntegrationCard } from "../components/oauth-integration-card";
import { IntegrationSection } from "../components/integration-section";
import { createProjectManagementIntegrations } from "./oauth-integrations";
import type { IntegrationsLoaderData } from "../server/loader";

interface Props {
  loaderData: IntegrationsLoaderData;
}

export function ProjectManagementIntegrations({ loaderData }: Props) {
  const navigate = useNavigate();

  const { orgSlug } = useParams<{
    orgSlug: string;
  }>();

  const integrations = createProjectManagementIntegrations({
    loaderData,
    navigate,
    orgSlug: orgSlug!,
  });

  return (
    <IntegrationSection title="Project Management">
      {integrations.map((integration) => (
        <OAuthIntegrationCard key={integration.name} {...integration} />
      ))}
    </IntegrationSection>
  );
}
