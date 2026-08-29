import { DocsPage } from "@features/public/landing/components/docs-page";

export function meta() {
  return [
    { title: "Docs | Feeduro" },
    { name: "description", content: "Setup guides and technical reference for Feeduro | feedback boards, roadmap, changelog, branding, SSO, widget, and integrations." },
  ];
}

export default function DocsRoute() {
  return <DocsPage />;
}
