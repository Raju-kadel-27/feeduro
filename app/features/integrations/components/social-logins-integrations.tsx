import { DiscordIcon, SlackIcon } from "@components/icons";
import { IntegrationSection } from "../components/integration-section";
import { SocialLoginCard } from "../components/social-login-card";

export const SOCIAL_LOGIN_INTEGRATIONS = [
  {
    key: "discord",
    name: "Discord",
    icon: <DiscordIcon />,
    description:
      "Allow users to sign in to Feediyo using their Discord account via OAuth 2.0.",
    docsUrl: "https://discord.com/developers/applications",
    setupSteps: [
      "Go to the Discord Developer Portal and create a new application.",
      "Under OAuth2 → Redirects, add: {BASE_URL}/api/auth/callback/discord",
      "Copy the Client ID and Client Secret from the OAuth2 tab.",
      "Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in your environment.",
      "Restart the server — Discord login will appear automatically.",
    ],
  },

  {
    key: "slack",
    name: "Slack",
    icon: <SlackIcon />,
    description:
      "Allow users to sign in to Feediyo using their Slack account via OAuth 2.0.",
    docsUrl: "https://api.slack.com/apps",
    setupSteps: [
      "Go to Your Apps on Slack API and create a new app from scratch.",
      "Under OAuth & Permissions → Redirect URLs, add: {BASE_URL}/api/auth/callback/slack",
      "Copy the Client ID and Client Secret from Basic Information.",
      "Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in your environment.",
      "Restart the server — Slack login will appear automatically.",
    ],
  },
];

interface Props {
  loaderData: any;
}

export function SocialLoginIntegrations({ loaderData }: Props) {
  return (
    <IntegrationSection title="Social Login">
      {SOCIAL_LOGIN_INTEGRATIONS.map((integration) => (
        <SocialLoginCard
          {...integration}
          enabled={
            loaderData[integration.key as keyof typeof loaderData].enabled
          }
        />
      ))}
    </IntegrationSection>
  );
}
