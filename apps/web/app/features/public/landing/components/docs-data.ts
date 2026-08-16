export type ContentBlock =
  | { type: "text"; body: string }
  | { type: "step"; number: number; title: string; body: string }
  | { type: "code"; lang: string; code: string }
  | { type: "note"; body: string }
  | { type: "grid"; items: { icon: string; title: string; body: string }[] };

export type DocPage = {
  id: string;
  title: string;
  description: string;
  blocks: ContentBlock[];
};

export type NavGroup = {
  label: string;
  items: { id: string; title: string }[];
};

export const NAV: NavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { id: "overview", title: "Overview" },
      { id: "quick-setup", title: "Quick Setup" },
    ],
  },
  {
    label: "Feedback Board",
    items: [
      { id: "feedback-overview", title: "Overview" },
      { id: "feedback-config", title: "Configuration" },
      { id: "feedback-embed", title: "Widget Embed" },
    ],
  },
  {
    label: "Roadmap",
    items: [
      { id: "roadmap-overview", title: "Overview" },
      { id: "roadmap-config", title: "Configuration" },
    ],
  },
  {
    label: "Changelog",
    items: [
      { id: "changelog-overview", title: "Overview" },
      { id: "changelog-publish", title: "Publishing Updates" },
    ],
  },
  {
    label: "Branding",
    items: [
      { id: "branding-theme", title: "Colors & Logo" },
      { id: "branding-domain", title: "Custom Domain" },
    ],
  },
  {
    label: "Authentication",
    items: [
      { id: "passkeys", title: "Passkeys" },
      { id: "sso", title: "Single Sign-On" },
    ],
  },
  {
    label: "Widget",
    items: [
      { id: "widget-install", title: "Installation" },
      { id: "widget-config", title: "Configuration" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { id: "integration-github", title: "GitHub" },
      { id: "integration-linear", title: "Linear" },
      { id: "integration-jira", title: "Jira" },
      { id: "integration-asana", title: "Asana" },
    ],
  },
];

export { PAGES } from "./docs-pages";
