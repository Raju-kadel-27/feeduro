import type { ReactNode } from "react";
import {
  AsanaIcon,
  ClickUpIcon,
  GitHubIcon,
  GitLabIcon,
  HubSpotIcon,
  IntercomIcon,
  JiraIcon,
  LinearIcon,
  MondayIcon,
  NotionIcon,
  SalesforceIcon,
  ShortcutIcon,
  SlackIcon,
  TrelloIcon,
  ZapierIcon,
  ZendeskIcon,
} from "@components/icons";

type Integration = { name: string; icon: ReactNode };

const INTEGRATIONS: Integration[] = [
  { name: "Jira", icon: <JiraIcon size={20} /> },
  { name: "Linear", icon: <LinearIcon className="h-5 w-5" /> },
  { name: "Asana", icon: <AsanaIcon size={20} /> },
  { name: "GitHub", icon: <GitHubIcon /> },
  { name: "GitLab", icon: <GitLabIcon size={20} /> },
  { name: "Trello", icon: <TrelloIcon size={20} /> },
  { name: "Monday", icon: <MondayIcon size={20} /> },
  { name: "Shortcut", icon: <ShortcutIcon size={20} /> },
  { name: "Slack", icon: <SlackIcon /> },
  { name: "Salesforce", icon: <SalesforceIcon size={20} /> },
  { name: "Zendesk", icon: <ZendeskIcon size={20} /> },
  { name: "Notion", icon: <NotionIcon size={20} /> },
  { name: "ClickUp", icon: <ClickUpIcon size={20} /> },
  { name: "Zapier", icon: <ZapierIcon size={20} /> },
  { name: "Intercom", icon: <IntercomIcon size={20} /> },
  { name: "HubSpot", icon: <HubSpotIcon size={20} /> },
];

export function IntegrationsSection() {
  const doubled = [...INTEGRATIONS, ...INTEGRATIONS];

  return (
    <section id="integrations" className="py-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 text-center mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Integrates with your stack
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Works where your team already works
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Push feedback directly into Jira, Linear, Asana, and 13 more tools. No copy-paste.
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        <div
          className="absolute inset-y-0 left-6 w-24 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to right, var(--background), transparent)",
          }}
        />
        <div
          className="absolute inset-y-0 right-6 w-24 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to left, var(--background), transparent)",
          }}
        />
        <div className="flex overflow-hidden">
          <div className="flex gap-3 animate-infinite-scroll shrink-0">
            {doubled.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="shrink-0 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground whitespace-nowrap hover:text-foreground hover:border-border/80 transition-colors"
              >
                {item.icon}
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
