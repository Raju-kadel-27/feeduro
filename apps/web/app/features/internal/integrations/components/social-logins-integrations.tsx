import { DiscordIcon, SlackIcon } from "@components/icons";
import { Switch } from "@components/ui/switch";
import { CheckCircle2, Hash } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useFetcher } from "react-router";
import type { IntegrationsLoaderData } from "../server/loader";
import { OAuthIntegrationCard } from "./oauth-integration-card";

interface Props {
  loaderData: IntegrationsLoaderData;
}

interface NotificationItem {
  key: "discord" | "slack";
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  connected: boolean;
  channel: string | null;
  connectPath: string;
  disconnectProvider: string;
}

const EVENTS_WITH_DESC = [
  { value: "feedback.created", label: "Feedback created", desc: "A new post is submitted to any board" },
  { value: "feedback.status_changed", label: "Feedback status changed", desc: "A post's status is updated by your team" },
  { value: "comment.created", label: "Comment created", desc: "A comment is added to any post" },
  { value: "changelog.created", label: "Changelog created", desc: "A new changelog entry is drafted" },
  { value: "changelog.published", label: "Changelog published", desc: "A changelog entry goes live" },
];

export function SocialLoginIntegrations({ loaderData }: Props) {
  const fetcher = useFetcher();
  const { discord, slack, notifications } = loaderData;

  const [enabledEvents, setEnabledEvents] = useState<string[]>(notifications.enabledEvents);

  const integrations: NotificationItem[] = [
    {
      key: "discord",
      name: "Discord",
      description: "Receive notifications in a Discord channel when feedback events occur.",
      icon: <DiscordIcon className="h-7 w-7 fill-[#5865F2]" />,
      enabled: discord.enabled,
      connected: discord.connected,
      channel: notifications.discordChannelId,
      connectPath: "/api/discord?intent=connect",
      disconnectProvider: "discord",
    },
    {
      key: "slack",
      name: "Slack",
      description: "Receive notifications in a Slack channel when feedback events occur.",
      icon: <SlackIcon className="h-7 w-7" />,
      enabled: slack.enabled,
      connected: slack.connected,
      channel: notifications.slackChannel,
      connectPath: "/api/slack?intent=connect",
      disconnectProvider: "slack",
    },
  ];

  function handleToggle(eventValue: string, checked: boolean) {
    const next = checked
      ? [...enabledEvents, eventValue]
      : enabledEvents.filter((e) => e !== eventValue);
    setEnabledEvents(next);
    fetcher.submit(
      { intent: "update_notification_events", events: JSON.stringify(next) },
      { method: "POST" },
    );
  }

  function renderAction(item: NotificationItem) {
    if (item.connected) {
      return (
        <fetcher.Form method="POST" action={`/api/${item.disconnectProvider}`}>
          <input type="hidden" name="intent" value="disconnect" />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Disconnect
          </button>
        </fetcher.Form>
      );
    }

    if (!item.enabled) return null;

    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <a
          href={item.connectPath}
          className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
        >
          Connect
        </a>
        <p className="text-[10px] text-muted-foreground">Redirects to {item.name}</p>
      </div>
    );
  }

  function renderFooter(item: NotificationItem) {
    if (!item.connected) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <CheckCircle2 size={13} />
        <span>Active — notifications are being sent</span>
        {item.channel && (
          <>
            <span className="text-muted-foreground">·</span>
            <Hash size={11} className="text-muted-foreground" />
            <span className="text-muted-foreground">{item.channel.replace(/^#/, "")}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-base font-medium text-gray-600">Notifications</h3>
      <div className="space-y-3">
        {integrations.map((integration) => (
          <OAuthIntegrationCard
            key={integration.key}
            name={integration.name}
            description={integration.description}
            icon={integration.icon}
            connected={integration.connected}
            action={renderAction(integration)}
            footer={renderFooter(integration) ?? undefined}
          />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Notification triggers</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle which events send a notification to Discord and Slack
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DiscordIcon className="h-4 w-4 fill-[#5865F2]" />
            <SlackIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {EVENTS_WITH_DESC.map(({ value, label, desc }) => (
            <div
              key={value}
              className="rounded-md border border-border bg-background px-3 py-2.5 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <Switch
                checked={enabledEvents.includes(value)}
                onCheckedChange={(checked) => handleToggle(value, checked)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
