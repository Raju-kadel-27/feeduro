import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://docs.feediyo.com",
  integrations: [
    starlight({
      title: "Feediyo API",
      description: "Public REST API reference for Feediyo — manage feedback boards, changelog, users, and roadmaps programmatically.",
      favicon: "/favicon.svg",
      head: [
        /* ── Fonts: Inter (body) + JetBrains Mono (code) ── */
        {
          tag: "link",
          attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" },
        },
        {
          tag: "link",
          attrs: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
          },
        },
        {
          tag: "meta",
          attrs: { property: "og:type", content: "website" },
        },
        {
          tag: "meta",
          attrs: { property: "og:site_name", content: "Feediyo API Docs" },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://docs.feediyo.com/og-image.png",
          },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary_large_image" },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://docs.feediyo.com/og-image.png",
          },
        },
      ],
      customCss: ["./src/styles/custom.css"],
      components: {
        PageTitle: "./src/components/PageTitle.astro",
      },
      sidebar: [
        { label: "Introduction", link: "/" },
        { label: "Quick Start", link: "/quickstart" },
        { label: "Authentication", link: "/authentication" },
        { label: "Pagination", link: "/pagination" },
        { label: "Errors", link: "/errors" },
        { label: "Limits", link: "/limits" },
        { label: "Recipes", link: "/recipes" },
        { label: "API Explorer", link: "/api-explorer", badge: { text: "Try it", variant: "tip" } },
        {
          label: "Endpoints",
          collapsed: false,
          items: [
            { label: "Boards", link: "/boards" },
            { label: "Posts", link: "/posts" },
            { label: "Status Changes", link: "/status-changes" },
            { label: "Votes", link: "/votes" },
            { label: "Comments", link: "/comments" },
            { label: "Tags", link: "/tags" },
            { label: "Categories", link: "/categories" },
            { label: "Changelog", link: "/changelog" },
            { label: "Users", link: "/users" },
            { label: "Roadmap", link: "/roadmap" },
            { label: "Webhooks", link: "/webhooks" },
          ],
        },
      ],
    }),
  ],
});
