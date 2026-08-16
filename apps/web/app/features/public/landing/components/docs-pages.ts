import type { DocPage } from "./docs-data";

export const PAGES: Record<string, DocPage> = {
  overview: {
    id: "overview",
    title: "Welcome to Feeduro",
    description: "Feeduro is a product feedback platform — collect feedback, manage your roadmap, publish changelogs, and embed a widget, all in one place.",
    blocks: [
      { type: "grid", items: [
        { icon: "MessageSquare", title: "Feedback Boards", body: "Collect structured feedback with voting, comments, and status tracking." },
        { icon: "Map", title: "Public Roadmap", body: "Show users what's planned, in progress, and shipped." },
        { icon: "BookOpen", title: "Changelog", body: "Announce product updates with rich-text posts tagged by category." },
        { icon: "Puzzle", title: "Widget", body: "Embed a feedback button directly in your app — no redirect needed." },
        { icon: "Palette", title: "Branding", body: "Match your brand with custom colors, logo, and your own domain." },
        { icon: "Plug", title: "Integrations", body: "Push feedback to GitHub, Linear, Jira, or Asana with one click." },
      ]},
    ],
  },

  "quick-setup": {
    id: "quick-setup",
    title: "Quick Setup",
    description: "Get Feeduro running for your team in under 5 minutes.",
    blocks: [
      { type: "text", body: "This guide walks you through the four steps to go from a blank workspace to a live public portal where users can submit and vote on feedback. Each step builds on the last — you can stop at any point and come back." },
      { type: "step", number: 1, title: "Create your workspace", body: "Sign up at feeduro.com. Your workspace is created automatically with a unique slug used in your portal URL." },
      { type: "step", number: 2, title: "Create a feedback board", body: "Go to Feedback in the sidebar → New Board. Give it a name (e.g. Feature Requests) and set visibility to Public or Private." },
      { type: "step", number: 3, title: "Invite your team", body: "Go to Settings → Team and send invite links. Roles: Admin (full access), Member (manage posts), Viewer (read-only)." },
      { type: "step", number: 4, title: "Share with users", body: "Copy your public portal URL from Settings → General and add it to your product or website." },
      { type: "note", body: "Your public portal is always at feeduro.com/{your-slug} — or your custom domain once configured." },
    ],
  },

  "feedback-overview": {
    id: "feedback-overview",
    title: "Feedback Board",
    description: "Feedback boards let users submit ideas, report issues, and vote on what matters most.",
    blocks: [
      { type: "text", body: "Instead of feedback arriving through Slack DMs, support tickets, and email threads, boards centralise it in one structured place. Your team sees the same picture — sorted by votes, filtered by status — and users see that their voice actually shapes the roadmap." },
      { type: "grid", items: [
        { icon: "ThumbsUp", title: "Voting", body: "Users upvote posts they care about. Sort by votes to see priorities instantly." },
        { icon: "MessageCircle", title: "Comments", body: "Team and users can discuss posts directly." },
        { icon: "Tag", title: "Statuses", body: "Mark posts as Under Review, Planned, In Progress, or Completed." },
        { icon: "Lock", title: "Visibility", body: "Set boards to Public, Private (members only), or Unlisted." },
      ]},
    ],
  },

  "feedback-config": {
    id: "feedback-config",
    title: "Feedback Configuration",
    description: "Customize posting permissions, notifications, and integration routing per board.",
    blocks: [
      { type: "text", body: "Configuring a board correctly from the start keeps it high-signal. Open posting works well for public products; member-only posting is better for internal tools or beta programs where you want filtered input." },
      { type: "step", number: 1, title: "Open board settings", body: "Click the gear icon inside your board, or go to Feedback → select board → Settings." },
      { type: "step", number: 2, title: "Set posting permissions", body: "Choose who can post: Anyone (including anonymous), Logged-in users, or Team members only." },
      { type: "step", number: 3, title: "Enable notifications", body: "Turn on email notifications so subscribers are alerted when a post status changes." },
      { type: "step", number: 4, title: "Connect an integration", body: "Under the Integrations tab, link the board to GitHub, Linear, or Jira so accepted posts can be pushed with one click." },
    ],
  },

  "feedback-embed": {
    id: "feedback-embed",
    title: "Widget Embed",
    description: "Route widget submissions to a specific board so users can post without leaving your app.",
    blocks: [
      { type: "text", body: "Feedback collected in-context — while a user is looking at the exact part of your product they're commenting on — is almost always more specific and actionable than feedback submitted on a separate page. The boardId setting ensures those submissions land in the right place." },
      { type: "step", number: 1, title: "Install the widget", body: "Add the script tag or React package to your app — see Widget → Installation." },
      { type: "step", number: 2, title: "Set the boardId", body: "Pass your board's ID in the widget config. Find it in Feedback → Settings → General." },
      { type: "code", lang: "js", code: 'Feeduro.init({\n  token: "YOUR_TOKEN",\n  boardId: "YOUR_BOARD_ID",\n});' },
      { type: "note", body: "Omit boardId to let users choose which board to post to from the widget panel." },
    ],
  },

  "roadmap-overview": {
    id: "roadmap-overview",
    title: "Roadmap",
    description: "A public roadmap shows users what you're building, what's in progress, and what's shipped.",
    blocks: [
      { type: "text", body: "A visible roadmap reduces 'when is X coming?' support questions and makes users feel like partners rather than bystanders. Because it's powered by your feedback posts, there's no separate system to maintain — status changes in one place update the roadmap automatically." },
      { type: "grid", items: [
        { icon: "Columns3", title: "Kanban View", body: "Three columns: Planned / In Progress / Completed. Drag posts between them." },
        { icon: "Calendar", title: "Quarters", body: "Optionally assign posts to a quarter for time-based planning." },
        { icon: "Globe", title: "Public Page", body: "Your roadmap is live at /{slug}/portal/roadmap — no login needed." },
        { icon: "EyeOff", title: "Private Items", body: "Posts with Private visibility are hidden from the public roadmap." },
      ]},
    ],
  },

  "roadmap-config": {
    id: "roadmap-config",
    title: "Roadmap Configuration",
    description: "Control which items appear on your public roadmap.",
    blocks: [
      { type: "text", body: "The roadmap shows only what you actively promote — it is a curated view, not an automatic dump of every feedback post. This keeps it focused and trustworthy for users who check it to track progress." },
      { type: "step", number: 1, title: "Enable the roadmap", body: "Go to Settings → Roadmap and toggle it on. This activates your public roadmap page." },
      { type: "step", number: 2, title: "Select visible boards", body: "Choose which feedback boards contribute items to the roadmap. Not every board needs to be shown." },
      { type: "step", number: 3, title: "Promote posts via status", body: "Change a post's status to Planned, In Progress, or Completed. It appears in the matching roadmap column automatically." },
      { type: "note", body: "Posts marked Private are excluded from the public roadmap regardless of their status." },
    ],
  },

  "changelog-overview": {
    id: "changelog-overview",
    title: "Changelog",
    description: "Announce product updates with structured, richly-formatted posts.",
    blocks: [
      { type: "text", body: "Closing the loop is one of the highest-leverage things a product team can do for retention. When a user sees that the feature they requested shipped — and gets an email about it — they feel heard. That moment builds lasting loyalty in a way that marketing rarely can." },
      { type: "grid", items: [
        { icon: "Edit3", title: "Rich Editor", body: "Write updates with headings, images, and code blocks." },
        { icon: "Tag", title: "Categories", body: "Tag entries as Feature, Improvement, Fix, or API." },
        { icon: "Clock", title: "Scheduled Posts", body: "Set a future publish date to release updates at the right time." },
        { icon: "Bell", title: "Subscriber Emails", body: "Subscribed users are notified automatically when you publish." },
      ]},
    ],
  },

  "changelog-publish": {
    id: "changelog-publish",
    title: "Publishing Updates",
    description: "Write and publish a changelog entry in four steps.",
    blocks: [
      { type: "text", body: "The best changelog entries are short and user-facing: what changed, what it means for them, and nothing else. Skip the internal jargon. Users subscribe to know what improved for them, not how you implemented it." },
      { type: "step", number: 1, title: "Open the changelog editor", body: "Go to Changelog in the sidebar and click New Entry." },
      { type: "step", number: 2, title: "Write your update", body: "Add a title, rich-text body, and select a category tag. Keep it concise — what changed and why it matters to the user." },
      { type: "step", number: 3, title: "Set a publish date", body: "Leave it as today to publish immediately, or pick a future date to schedule. Drafts auto-save." },
      { type: "step", number: 4, title: "Publish", body: "Click Publish. The entry goes live on your changelog page and email subscribers are notified." },
    ],
  },

  "branding-theme": {
    id: "branding-theme",
    title: "Colors & Logo",
    description: "Customize your public portal to match your brand.",
    blocks: [
      { type: "text", body: "Your portal is often the first place users go to interact with your team. A branded experience — your logo, your colors — signals that you take their input seriously and that this isn't just a generic feedback box. It also keeps the experience consistent with the rest of your product." },
      { type: "step", number: 1, title: "Open Branding settings", body: "Navigate to Settings → Branding in your workspace." },
      { type: "step", number: 2, title: "Upload your logo", body: "Upload a PNG or SVG (512×512px recommended). It appears in your portal header and notification emails." },
      { type: "step", number: 3, title: "Set brand color", body: "Pick your primary color. It applies to buttons, links, and accents throughout the portal." },
      { type: "step", number: 4, title: "Choose default theme", body: "Select Light or Dark as the default for your portal. Users can switch if you enable the toggle." },
      { type: "note", body: "White-label branding (removing Feeduro attribution) is available on the Professional plan." },
    ],
  },

  "branding-domain": {
    id: "branding-domain",
    title: "Custom Domain",
    description: "Serve your public portal from your own domain, e.g. feedback.yourcompany.com.",
    blocks: [
      { type: "text", body: "A custom domain removes feeduro.com from your portal URL entirely, making it feel like a native part of your product. Users stay in your brand's context the whole time — no third-party domain visible in the address bar or anywhere else." },
      { type: "step", number: 1, title: "Enter your subdomain", body: "Go to Settings → Domain and type the subdomain you want to use." },
      { type: "step", number: 2, title: "Add a CNAME record", body: "In your DNS provider, add a CNAME record pointing your subdomain to feeduro.com." },
      { type: "code", lang: "dns", code: "Type:  CNAME\nName:  feedback   (or your chosen prefix)\nValue: feeduro.com" },
      { type: "step", number: 3, title: "Verify & activate", body: "Click Verify in Feeduro. DNS propagation can take up to 24 hours. SSL is provisioned automatically." },
      { type: "note", body: "Custom domain requires the Professional plan." },
    ],
  },

  passkeys: {
    id: "passkeys",
    title: "Passkeys",
    description: "Let your team authenticate with Face ID, Touch ID, or a hardware key — no password needed.",
    blocks: [
      { type: "text", body: "Passkeys are cryptographic credentials stored on your device — they can't be phished, leaked in a data breach, or guessed. Each team member registers their own passkey on their own device, so there is nothing shared org-wide to protect." },
      { type: "step", number: 1, title: "Open Security settings", body: "Go to Account Settings → Security and click Add passkey." },
      { type: "step", number: 2, title: "Register your device", body: "Your browser prompts you to authenticate with biometrics or a hardware key. Follow the on-screen steps." },
      { type: "step", number: 3, title: "Sign in with passkey", body: "On your next login, click Sign in with passkey instead of entering a password." },
    ],
  },

  sso: {
    id: "sso",
    title: "Single Sign-On (SSO)",
    description: "Let your team authenticate via your identity provider using SAML 2.0 or OIDC.",
    blocks: [
      { type: "text", body: "SSO means your team logs in with the same credentials they use for every other internal tool — no separate Feeduro password to manage, forget, or reset. When someone leaves the company, revoking access in your IdP instantly revokes it in Feeduro too." },
      { type: "step", number: 1, title: "Open SSO settings", body: "Go to Settings → SSO. SSO is available on the Professional plan." },
      { type: "step", number: 2, title: "Choose a protocol", body: "Select SAML 2.0 (Okta, Azure AD, Google Workspace, OneLogin) or OIDC (Auth0, Keycloak, custom providers)." },
      { type: "step", number: 3, title: "Configure your IdP", body: "Copy the ACS URL and Entity ID from Feeduro and paste them into your identity provider's application settings." },
      { type: "code", lang: "text", code: "ACS URL:   https://feeduro.com/auth/sso/callback\nEntity ID: https://feeduro.com" },
      { type: "step", number: 4, title: "Paste IdP metadata", body: "Copy your IdP's metadata URL or XML and paste it into the Feeduro SSO form, then click Save." },
      { type: "step", number: 5, title: "Test & enforce", body: "Click Test connection. Once verified, toggle Enforce SSO. Password login is disabled org-wide; admins retain a break-glass email login." },
    ],
  },

  "widget-install": {
    id: "widget-install",
    title: "Installation",
    description: "Embed the Feeduro widget in your app with one script tag or the React package.",
    blocks: [
      { type: "text", body: "The widget is a lightweight panel that opens inside your app — users never leave the page. It takes a single line of HTML or one React component. Pick whichever fits your stack." },
      { type: "grid", items: [
        { icon: "Code2", title: "Script Tag", body: "Paste one <script> tag into your HTML. No build step required." },
        { icon: "Package", title: "React Package", body: "Install @feeduro/react for a type-safe React component." },
      ]},
      { type: "step", number: 1, title: "Option A — Script tag", body: "Add this before </body> in your HTML:" },
      { type: "code", lang: "html", code: '<script\n  src="https://cdn.feeduro.com/widget.js"\n  data-token="YOUR_TOKEN"\n  async>\n</script>' },
      { type: "step", number: 2, title: "Option B — React", body: "Install the package and render the component:" },
      { type: "code", lang: "tsx", code: 'npm install @feeduro/react\n\nimport { FeeduroWidget } from "@feeduro/react";\n\n<FeeduroWidget token="YOUR_TOKEN" />' },
      { type: "note", body: "Your token is in Settings → Widget. Keep it out of public repos." },
    ],
  },

  "widget-config": {
    id: "widget-config",
    title: "Configuration",
    description: "Customize the widget's appearance, position, and user identification.",
    blocks: [
      { type: "text", body: "Passing the user object is the single most valuable config option — it links every submission to a real user in your dashboard so you can follow up, segment by plan, and understand who is asking for what." },
      { type: "code", lang: "js", code: 'Feeduro.init({\n  token: "YOUR_TOKEN",\n\n  // Appearance\n  position: "bottom-right",  // bottom-right | bottom-left\n  theme: "auto",             // light | dark | auto\n\n  // Identify the logged-in user (optional but recommended)\n  user: {\n    id: "user_123",\n    email: "user@example.com",\n    name: "Jane Doe",\n  },\n\n  // Route submissions to a specific board (optional)\n  boardId: "YOUR_BOARD_ID",\n});' },
      { type: "note", body: "When theme is auto, the widget respects the user's OS color scheme. Pass user to track submissions per-user in your dashboard." },
    ],
  },

  "integration-github": {
    id: "integration-github",
    title: "GitHub",
    description: "Push accepted feedback to GitHub Issues with one click.",
    blocks: [
      { type: "text", body: "This integration works best when engineers are already living in GitHub Issues. Each pushed post becomes an issue with the full user context attached — no copy-pasting, no lost thread. Engineers see what the user actually said, not a secondhand summary." },
      { type: "step", number: 1, title: "Connect GitHub", body: "Go to Settings → Integrations → GitHub → Connect. Authorize Feeduro to access your repositories." },
      { type: "step", number: 2, title: "Select a repository", body: "Choose the repo where feedback issues should be created." },
      { type: "step", number: 3, title: "Push a post", body: "Open any feedback post → Push to GitHub. An issue is created with the post title, description, and a link back." },
      { type: "note", body: "Status sync is one-way. Closing a GitHub issue does not automatically update the Feeduro post." },
    ],
  },

  "integration-linear": {
    id: "integration-linear",
    title: "Linear",
    description: "Create Linear issues from feedback and sync status back automatically.",
    blocks: [
      { type: "text", body: "Linear's two-way status sync is what makes this integration genuinely useful: when your engineering team moves an issue to Done in Linear, the feedback post in Feeduro updates to Completed — and subscribers get notified automatically. No manual status updates needed." },
      { type: "step", number: 1, title: "Connect Linear", body: "Go to Settings → Integrations → Linear → Connect. Select your Linear workspace." },
      { type: "step", number: 2, title: "Map team & project", body: "Choose the Linear team and project where feedback issues will be created." },
      { type: "step", number: 3, title: "Push a post", body: "Open a feedback post → Push to Linear. A Linear issue is created with the title, description, and a Feeduro backlink." },
      { type: "step", number: 4, title: "Two-way status sync", body: "When the Linear issue status changes (e.g. Done), the Feeduro post status updates automatically." },
    ],
  },

  "integration-jira": {
    id: "integration-jira",
    title: "Jira",
    description: "Create Jira tickets from feedback with automatic status sync.",
    blocks: [
      { type: "text", body: "If Jira is your team's source of truth for all work, pushing feedback here keeps everything in one system. Your PM can assign, prioritise, and track the ticket without switching tools, while the original user context stays linked in Feeduro." },
      { type: "step", number: 1, title: "Connect Jira", body: "Go to Settings → Integrations → Jira → Connect. Log in with Atlassian and select the site to authorize." },
      { type: "step", number: 2, title: "Select project & issue type", body: "Choose the Jira project and issue type (Bug, Story, Task) for incoming feedback posts." },
      { type: "step", number: 3, title: "Push a post", body: "Open any feedback post → Push to Jira. A ticket is created with the title, description, and a link back." },
      { type: "note", body: "Jira integration requires the Professional plan." },
    ],
  },

  "integration-asana": {
    id: "integration-asana",
    title: "Asana",
    description: "Create Asana tasks from feedback posts.",
    blocks: [
      { type: "text", body: "Use the Asana integration when your product team tracks work as tasks rather than issues. Each piece of feedback becomes a concrete, assignable task with the user's original description attached — ready to assign, estimate, and schedule." },
      { type: "step", number: 1, title: "Connect Asana", body: "Go to Settings → Integrations → Asana → Connect. Authorize Feeduro in your Asana workspace." },
      { type: "step", number: 2, title: "Choose a project", body: "Select the Asana project where new tasks should be created." },
      { type: "step", number: 3, title: "Push a post", body: "Open any feedback post → Push to Asana. A task is created with the post title, description, and a backlink." },
    ],
  },
};
