import type { ReactNode } from "react";
import {
  AsanaIcon,
  ClickUpIcon,
  DiscordIcon,
  GitHubIcon,
  GitLabIcon,
  HubSpotIcon,
  IntercomIcon,
  JiraIcon,
  LinearIcon,
  MondayIcon,
  N8nIcon,
  NotionIcon,
  SalesforceIcon,
  ShortcutIcon,
  SlackIcon,
  TrelloIcon,
  ZapierIcon,
  ZendeskIcon,
} from "@components/icons";

type Integration = { name: string; description: string; icon: ReactNode; comingSoon?: boolean };

const INTEGRATIONS: Integration[] = [
  { name: "Jira", description: "Push feedback as Jira issues and sync status back automatically.", icon: <JiraIcon size={36} /> },
  { name: "Linear", description: "Create Linear issues from feedback and keep them in sync.", icon: <LinearIcon className="h-9 w-9" /> },
  { name: "Asana", description: "Turn user feedback into Asana tasks seamlessly.", icon: <AsanaIcon size={36} /> },
  { name: "GitHub", description: "Create GitHub issues from feedback and track progress.", icon: <GitHubIcon className="h-9 w-9" /> },
  { name: "GitLab", description: "Push feedback directly to GitLab issues.", icon: <GitLabIcon size={36} /> },
  { name: "Trello", description: "Create Trello cards from feedback automatically.", icon: <TrelloIcon size={36} /> },
  { name: "Monday", description: "Sync feedback to Monday.com boards and track work.", icon: <MondayIcon size={36} /> },
  { name: "Shortcut", description: "Create Shortcut stories from user feedback effortlessly.", icon: <ShortcutIcon size={36} /> },
  { name: "ClickUp", description: "Push feedback to ClickUp tasks and stay aligned.", icon: <ClickUpIcon size={36} /> },
  { name: "Notion", description: "Log feedback and insights directly into Notion pages.", icon: <NotionIcon size={36} /> },
  { name: "Slack", description: "Get real-time alerts in Slack for new board activity.", icon: <SlackIcon className="h-9 w-9" /> },
  { name: "Discord", description: "Receive notifications in Discord for new feedback.", icon: <DiscordIcon className="h-9 w-9" /> },
  { name: "Salesforce", description: "Connect feedback to Salesforce CRM records.", icon: <SalesforceIcon size={36} />, comingSoon: true },
  { name: "HubSpot", description: "Sync user feedback with HubSpot contacts and deals.", icon: <HubSpotIcon size={36} />, comingSoon: true },
  { name: "Zendesk", description: "Collect and link feedback directly in Zendesk.", icon: <ZendeskIcon size={36} />, comingSoon: true },
  { name: "Intercom", description: "Gather feedback directly in Intercom messenger.", icon: <IntercomIcon size={36} /> },
  { name: "Zapier", description: "Integrate with thousands of apps via Zapier.", icon: <ZapierIcon size={36} />, comingSoon: true },
  { name: "n8n", description: "Build powerful automations with n8n workflows.", icon: <N8nIcon size={36} />, comingSoon: true },
];

export function IntegrationsSection() {
  return (
    <section id="integrations" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Integrations
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Integrate with your favourite apps
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            We offer built-in integrations supporting{" "}
            <strong className="text-foreground">2-way sync</strong> with the
            apps you already use — no copy-paste required.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.name}
              className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:border-border/80 hover:bg-card/80 transition-colors"
            >
              {item.comingSoon && (
                <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Coming soon
                </span>
              )}
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-background border border-border/60">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">{item.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
