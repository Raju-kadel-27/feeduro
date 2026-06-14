import { DiscordIcon, SlackIcon } from "@components/icons";
import type React from "react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { IntegrationSection } from "../components/integration-section";
import { IntegrationTile } from "../components/integration-tile";

interface SocialItem {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  docsUrl: string;
  setupSteps: string[];
}

const SOCIAL_LOGIN_INTEGRATIONS: SocialItem[] = [
  {
    key: "discord",
    name: "Discord",
    icon: <DiscordIcon className="h-7 w-7 fill-[#5865F2]" />,
    description: "Allow users to sign in to Feeduro using their Discord account via OAuth 2.0.",
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
    icon: <SlackIcon className="h-7 w-7" />,
    description: "Allow users to sign in to Feeduro using their Slack account via OAuth 2.0.",
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
  const [selected, setSelected] = useState<SocialItem | null>(null);

  return (
    <>
      <IntegrationSection title="Social Login">
        {SOCIAL_LOGIN_INTEGRATIONS.map((integration) => (
          <IntegrationTile
            key={integration.key}
            name={integration.name}
            icon={integration.icon}
            connected={loaderData[integration.key as keyof typeof loaderData]?.enabled ?? false}
            onClick={() => setSelected(integration)}
          />
        ))}
      </IntegrationSection>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted">
                    {selected.icon}
                  </div>
                  <SheetTitle>{selected.name}</SheetTitle>
                </div>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-3">
                <p className="text-[13px] font-medium text-foreground">Setup required</p>
                <ol className="space-y-2 list-decimal list-inside">
                  {selected.setupSteps.map((step) => (
                    <li key={step} className="text-[13px] text-muted-foreground leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
                <a
                  href={selected.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-[13px] text-primary hover:underline"
                >
                  View documentation →
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
