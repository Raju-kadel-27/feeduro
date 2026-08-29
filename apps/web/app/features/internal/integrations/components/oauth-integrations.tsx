import {
  AsanaIcon,
  ClickUpIcon,
  GitHubIcon,
  JiraIcon,
  LinearIcon,
  MondayIcon,
  NotionIcon,
  ShortcutIcon,
  TrelloIcon,
} from "@components/icons";
import { GitBranch } from "lucide-react";

import { ensureIntegrationConfigured } from "../utils";

export function createProjectManagementIntegrations({ loaderData, navigate, orgSlug }: any) {
  const { linear, github, jira, asana, notion, monday, trello, shortcut, clickup } = loaderData;

  return [
    {
      name: "Linear",

      icon: <LinearIcon className="h-10 w-10 text-foreground" />,

      connected: linear.connected,

      footer:
        linear.connected && linear.workspaceName ? (
          <span>{linear.workspaceName}</span>
        ) : undefined,

      description:
        linear.connected && linear.workspaceName
          ? `Connected to ${linear.workspaceName}. Create Linear issues directly from roadmap cards.`
          : "Create Linear issues from feedback and keep your product roadmap in sync.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            linear.configured,
            "Linear OAuth app not configured. Set LINEAR_CLIENT_ID and LINEAR_CLIENT_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/linear`);
      },
    },

    {
      name: "GitHub Issues",

      icon: <GitHubIcon className="h-10 w-10 fill-foreground" />,

      connected: github.connected,

      footer:
        github.connected && github.repo ? (
          <>
            <GitBranch size={11} />
            <span>{github.repo}</span>
          </>
        ) : undefined,

      description:
        github.connected && github.repo
          ? `Linked to ${github.repo}. Create or link GitHub issues directly from roadmap cards.`
          : "Link your roadmap to a GitHub repository. Create issues from feedback or sync existing ones.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            github.configured,
            "GitHub OAuth app not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/github`);
      },
    },

    {
      name: "Jira",

      icon: <JiraIcon size={40} />,

      connected: jira.connected,

      description:
        jira.connected && jira.cloudName
          ? `Connected to ${jira.cloudName}. Create Jira issues directly from roadmap cards.`
          : "Create Jira issues from feedback and keep your project tracking in sync.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            jira.configured,
            "Jira OAuth app not configured. Set JIRA_CLIENT_ID and JIRA_CLIENT_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/jira`);
      },
    },

    {
      name: "Asana",

      icon: <AsanaIcon size={40} />,

      connected: asana.connected,

      description:
        asana.connected && asana.workspaceName
          ? `Connected to ${asana.workspaceName}. Create Asana tasks directly from roadmap cards.`
          : "Create Asana tasks from feedback and keep your team's work in sync.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            asana.configured,
            "Asana OAuth app not configured. Set ASANA_CLIENT_ID and ASANA_CLIENT_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/asana`);
      },
    },

    {
      name: "Notion",

      icon: <NotionIcon size={40} />,

      connected: notion.connected,

      description:
        notion.connected && notion.workspaceName
          ? `Connected to ${notion.workspaceName}. Create Notion pages directly from feedback posts.`
          : "Create Notion pages from feedback and keep your docs in sync.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            notion.configured,
            "Notion OAuth app not configured. Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/notion`);
      },
    },

    {
      name: "Monday.com",

      icon: <MondayIcon size={40} />,

      connected: monday.connected,

      description:
        monday.connected && monday.accountName
          ? `Connected to ${monday.accountName}. Create Monday.com items directly from feedback posts.`
          : "Create Monday.com items from feedback and keep your team's work in sync.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            monday.configured,
            "Monday.com OAuth app not configured. Set MONDAY_CLIENT_ID and MONDAY_CLIENT_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/monday`);
      },
    },

    {
      name: "Trello",

      icon: <TrelloIcon size={40} />,

      connected: trello.connected,

      description:
        trello.connected && trello.memberUsername
          ? `Connected as @${trello.memberUsername}. Create Trello cards directly from feedback posts.`
          : "Create Trello cards from feedback and keep your boards in sync.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            trello.configured,
            "Trello not configured. Set TRELLO_API_KEY and TRELLO_API_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/trello`);
      },
    },

    {
      name: "Shortcut",

      icon: <ShortcutIcon size={40} />,

      connected: shortcut.connected,

      description:
        shortcut.connected && shortcut.memberName
          ? `Connected as ${shortcut.memberName}. Create Shortcut stories directly from feedback posts.`
          : "Create Shortcut stories from feedback and keep your product backlog in sync.",

      onClick: () => {
        navigate(`/${orgSlug}/settings/integrations/shortcut`);
      },
    },

    {
      name: "ClickUp",

      icon: <ClickUpIcon size={40} />,

      connected: clickup.connected,

      description:
        clickup.connected && clickup.workspaceName
          ? `Connected to ${clickup.workspaceName}. Create ClickUp tasks directly from roadmap cards.`
          : "Create ClickUp tasks from feedback and keep your team's work in sync.",

      onClick: () => {
        if (
          !ensureIntegrationConfigured(
            clickup.configured,
            "ClickUp OAuth app not configured. Set CLICKUP_CLIENT_ID and CLICKUP_CLIENT_SECRET in your environment.",
          )
        ) {
          return;
        }

        navigate(`/${orgSlug}/settings/integrations/clickup`);
      },
    },
  ];
}
