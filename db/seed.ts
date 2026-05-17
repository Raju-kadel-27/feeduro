// @ts-nocheck
import { createId } from "@paralleldrive/cuid2";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import {
  changelogs,
  changelogTags,
  comments,
  feedbackBoards,
  feedbackCategories,
  feedbackPosts,
  feedbackTags,
  feedbackViews,
  integrations,
  postActivities,
  postExternalLinks,
  postTags,
  reactions,
  segments,
  userProfiles,
  votes,
  webhookEndpoints,
  widgetConfigs,
} from "./schema/app";
import { account, member, organization, user } from "./schema/better-auth";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/feediyo";

const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });
const db = drizzle(pool, { schema });

// ─── Users ────────────────────────────────────────────────────────────────────

const USERS = [
  { name: "John Doe", email: "johndoe@gmail.com", password: "password" },
  { name: "Alice Chen", email: "alice@acmecorp.dev", password: "password" },
  { name: "Bob Martinez", email: "bob@acmecorp.dev", password: "password" },
  { name: "Sara Kim", email: "sara@acmecorp.dev", password: "password" },
  { name: "Dave Patel", email: "dave@acmecorp.dev", password: "password" },
];

// ─── BlockNote block helper ──────────────────────────────────────────────────

function bn(id, type, text, extraProps = {}) {
  return {
    id,
    type,
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
      ...extraProps,
    },
    content: [{ type: "text", text, styles: {} }],
    children: [],
  };
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── 1. Users & Accounts ──────────────────────────────────────────────────
  // Look up by email so re-runs reuse the same IDs (avoids FK violations).

  const userIds: Record<string, string> = {};

  for (const u of USERS) {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, u.email))
      .limit(1);

    if (existing) {
      userIds[u.email] = existing.id;
    } else {
      const id = createId();
      userIds[u.email] = id;
      await db.insert(user).values({
        id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const hashed = await hashPassword(u.password);
      await db.insert(account).values({
        id: createId(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  console.log(`✅ Users ready (${USERS.length})`);

  // ── 2. Organization ──────────────────────────────────────────────────────

  let orgId: string;
  const [existingOrg] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, "acme-corp"))
    .limit(1);

  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    orgId = createId();
    await db.insert(organization).values({
      id: orgId,
      name: "Acme Corp",
      slug: "acme-corp",
      createdAt: new Date(),
    });
  }

  console.log(`✅ Organization ready (id: ${orgId})`);

  // ── Clear transient data so re-runs always get fresh state ───────────────

  await db.delete(member).where(eq(member.organizationId, orgId));
  await db.delete(postActivities).where(eq(postActivities.organizationId, orgId));
  await db.delete(reactions).where(eq(reactions.organizationId, orgId));
  await db.delete(votes).where(eq(votes.organizationId, orgId));
  await db.delete(comments).where(eq(comments.organizationId, orgId));
  await db.delete(postExternalLinks).where(eq(postExternalLinks.organizationId, orgId));
  // postTags cascades from feedbackPosts (no organizationId column)
  await db.delete(feedbackPosts).where(eq(feedbackPosts.organizationId, orgId));
  await db.delete(feedbackTags).where(eq(feedbackTags.organizationId, orgId));
  await db.delete(feedbackCategories).where(eq(feedbackCategories.organizationId, orgId));
  await db.delete(feedbackViews).where(eq(feedbackViews.organizationId, orgId));
  await db.delete(feedbackBoards).where(eq(feedbackBoards.organizationId, orgId));
  await db.delete(changelogTags).where(eq(changelogTags.organizationId, orgId));
  await db.delete(changelogs).where(eq(changelogs.organizationId, orgId));
  await db.delete(webhookEndpoints).where(eq(webhookEndpoints.organizationId, orgId));
  await db.delete(integrations).where(eq(integrations.organizationId, orgId));
  await db.delete(widgetConfigs).where(eq(widgetConfigs.organizationId, orgId));
  await db.delete(segments).where(eq(segments.organizationId, orgId));
  await db.delete(userProfiles).where(eq(userProfiles.organizationId, orgId));

  // ── 3. Members ───────────────────────────────────────────────────────────

  for (const [email, uid] of Object.entries(userIds)) {
    await db.insert(member).values({
      id: createId(),
      organizationId: orgId,
      userId: uid,
      role: email === "johndoe@gmail.com" ? "admin" : "member",
      createdAt: new Date(),
    });
  }

  console.log("✅ Members ready");

  // ── 4. Feedback Boards ───────────────────────────────────────────────────

  const boardDefs = [
    {
      name: "Feature Requests",
      slug: "feature-requests",
      description: "Suggest and vote on new features",
      isDefault: true,
    },
    {
      name: "Bug Reports",
      slug: "bug-reports",
      description: "Report issues and bugs",
      isDefault: true,
    },
    {
      name: "Integrations",
      slug: "integrations",
      description: "Requests for third-party integrations",
    },
  ];

  const boardIds: Record<string, string> = {};
  const johnId = userIds["johndoe@gmail.com"];

  for (const b of boardDefs) {
    const id = createId();
    boardIds[b.slug] = id;
    await db.insert(feedbackBoards).values({
      id,
      organizationId: orgId,
      name: b.name,
      slug: b.slug,
      description: b.description,
      isDefault: b.isDefault ?? false,
      createdBy: johnId,
      visibility: "public",
    });
  }

  console.log("✅ Created 3 boards");

  // ── 4.5. Feedback Categories ─────────────────────────────────────────────

  const categoryDefs = [
    { name: "Bug", color: "#ef4444" },
    { name: "Feature", color: "#8b5cf6" },
    { name: "UX/Design", color: "#3b82f6" },
    { name: "Performance", color: "#f59e0b" },
    { name: "Documentation", color: "#10b981" },
  ];

  const categoryIds: Record<string, string> = {};
  for (const c of categoryDefs) {
    const id = createId();
    categoryIds[c.name] = id;
    await db.insert(feedbackCategories).values({ id, organizationId: orgId, name: c.name, color: c.color });
  }
  console.log(`✅ Created ${categoryDefs.length} feedback categories`);

  // ── 4.7. Feedback Tags ────────────────────────────────────────────────────

  const tagDefs = [
    { name: "high-priority", color: "#ef4444" },
    { name: "customer-request", color: "#3b82f6" },
    { name: "quick-win", color: "#10b981" },
    { name: "needs-design", color: "#f59e0b" },
    { name: "breaking-change", color: "#6366f1" },
  ];

  const tagIds: Record<string, string> = {};
  for (const t of tagDefs) {
    const id = createId();
    tagIds[t.name] = id;
    await db.insert(feedbackTags).values({ id, organizationId: orgId, name: t.name, color: t.color });
  }
  console.log(`✅ Created ${tagDefs.length} feedback tags`);

  // ── 5. Feedback Posts ────────────────────────────────────────────────────

  const allUserIds = Object.values(userIds);

  const postDefs = [
    // Feature Requests
    {
      title: "Dark mode support",
      description:
        "Would love a dark mode option across the entire dashboard. It's easier on the eyes during late-night work sessions.",
      boardSlug: "feature-requests",
      status: "planned",
      createdBy: allUserIds[0],
      category: "UX/Design",
    },
    {
      title: "Bulk status update for posts",
      description:
        "Allow admins to select multiple posts and update their status in one action instead of one by one.",
      boardSlug: "feature-requests",
      status: "reviewing",
      createdBy: allUserIds[1],
      category: "Feature",
    },
    {
      title: "Email digest for new feedback",
      description:
        "Send a daily or weekly email summary of new feedback posts to team members so nothing gets missed.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[2],
      category: "Feature",
    },
    {
      title: "Keyboard shortcuts",
      description:
        "Add keyboard shortcuts for common actions like opening posts, changing status, and navigating between boards.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[3],
      category: "UX/Design",
    },
    {
      title: "Custom post statuses",
      description: "Allow organizations to define their own post statuses beyond the defaults.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[4],
      category: "Feature",
    },
    {
      title: "CSV export of all feedback",
      description:
        "Export all feedback posts with votes, comments, and status as a CSV file for reporting.",
      boardSlug: "feature-requests",
      status: "completed",
      createdBy: allUserIds[1],
      category: "Feature",
    },
    {
      title: "Roadmap view as public page",
      description:
        "Share a public-facing roadmap page that shows planned and in-progress items to customers.",
      boardSlug: "feature-requests",
      status: "in-progress",
      createdBy: allUserIds[0],
      category: "Feature",
    },
    {
      title: "Pin important posts to top",
      description:
        "Let admins pin high-priority posts to the top of the board so they stay visible.",
      boardSlug: "feature-requests",
      status: "planned",
      createdBy: allUserIds[2],
      category: "UX/Design",
    },
    {
      title: "Mobile app",
      description: "A native iOS and Android app for managing feedback on the go.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[3],
      category: "Feature",
    },
    {
      title: "Mention teammates in comments",
      description:
        "Use @username to mention team members in comments and trigger email notifications.",
      boardSlug: "feature-requests",
      status: "in-progress",
      createdBy: allUserIds[4],
      category: "Feature",
    },
    // Bug Reports
    {
      title: "Vote count not updating in real-time",
      description: "When I upvote a post, the count doesn't update until I refresh the page.",
      boardSlug: "bug-reports",
      status: "in-progress",
      createdBy: allUserIds[2],
      category: "Bug",
    },
    {
      title: "Long post titles overflow the card",
      description:
        "On the board view, post titles longer than ~80 characters break the card layout on smaller screens.",
      boardSlug: "bug-reports",
      status: "completed",
      createdBy: allUserIds[3],
      category: "Bug",
    },
    {
      title: "Can't remove a vote once cast",
      description:
        "After voting on a post, there's no way to undo it. Clicking the vote button again does nothing.",
      boardSlug: "bug-reports",
      status: "reviewing",
      createdBy: allUserIds[0],
      category: "Bug",
    },
    {
      title: "Sign-in redirect loop on Safari",
      description:
        "On Safari 17, after signing in with Google I get redirected back to the sign-in page in a loop.",
      boardSlug: "bug-reports",
      status: "planned",
      createdBy: allUserIds[1],
      category: "Bug",
    },
    {
      title: "Widget not loading on Firefox",
      description:
        "The embedded feedback widget fails to render on Firefox 124+. Console shows a CORS error.",
      boardSlug: "bug-reports",
      status: "open",
      createdBy: allUserIds[4],
      category: "Bug",
    },
    // Integrations
    {
      title: "Slack integration for new posts",
      description:
        "Post a Slack message to a chosen channel whenever a new feedback post is created.",
      boardSlug: "integrations",
      status: "planned",
      createdBy: allUserIds[0],
      category: "Feature",
    },
    {
      title: "Linear sync",
      description:
        "Two-way sync with Linear — convert feedback posts to issues and reflect status changes back.",
      boardSlug: "integrations",
      status: "reviewing",
      createdBy: allUserIds[1],
      category: "Feature",
    },
    {
      title: "Zapier integration",
      description: "Trigger Zaps when a post is created, status changes, or a comment is added.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[2],
      category: "Feature",
    },
    {
      title: "Intercom widget embed",
      description:
        "Allow embedding the feedback widget inside the Intercom messenger for seamless in-app feedback.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[3],
      category: "Feature",
    },
    {
      title: "GitHub Issues sync",
      description:
        "Automatically create GitHub issues from feedback posts and sync status bidirectionally.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[4],
      category: "Feature",
    },
    // More Feature Requests (idx 20–29)
    {
      title: "Audit log and activity history",
      description:
        "Show a full audit trail of who changed what and when — status updates, comments, assignments — so teams stay accountable.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[0],
      category: "Feature",
    },
    {
      title: "Custom branding and white-labeling",
      description:
        "Let us set our own logo, brand colors, and custom domain so the feedback portal feels native to our product.",
      boardSlug: "feature-requests",
      status: "planned",
      createdBy: allUserIds[1],
      category: "UX/Design",
    },
    {
      title: "Multi-language and i18n support",
      description:
        "Support multiple languages for the public-facing widget and portal so non-English customers can submit feedback comfortably.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[2],
      category: "Feature",
    },
    {
      title: "Two-factor authentication",
      description:
        "Add TOTP-based 2FA for team member logins to improve account security, especially for admin accounts.",
      boardSlug: "feature-requests",
      status: "planned",
      createdBy: allUserIds[3],
      category: "Feature",
    },
    {
      title: "Saved search filters",
      description:
        "Allow users to save commonly-used filter combinations (status, board, tag) as named presets they can quickly switch between.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[4],
      category: "UX/Design",
    },
    {
      title: "Nested comment threads",
      description:
        "Support threaded replies in comments so team discussions stay organized and customers can follow specific sub-conversations.",
      boardSlug: "feature-requests",
      status: "reviewing",
      createdBy: allUserIds[0],
      category: "Feature",
    },
    {
      title: "Post templates",
      description:
        "Provide default templates for common feedback types (bug, feature request, question) to guide submitters and keep posts consistent.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[1],
      category: "UX/Design",
    },
    {
      title: "Feedback analytics dashboard",
      description:
        "A dedicated analytics view showing trends in post volume, vote activity, top boards, and resolution time over time.",
      boardSlug: "feature-requests",
      status: "planned",
      createdBy: allUserIds[2],
      category: "Feature",
    },
    {
      title: "Custom user roles and permissions",
      description:
        "Define granular roles beyond admin/member — e.g. a viewer who can read but not comment, or a moderator who can change statuses.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[3],
      category: "Feature",
    },
    {
      title: "Changelog email subscriptions",
      description:
        "Let end-users subscribe to the changelog and receive an email whenever a new entry is published.",
      boardSlug: "feature-requests",
      status: "in-progress",
      createdBy: allUserIds[4],
      category: "Feature",
    },
    // More Bug Reports (idx 30–34)
    {
      title: "Email notifications not sending",
      description:
        "Several team members stopped receiving email alerts for new comments and status changes two days ago. Checked spam — nothing there.",
      boardSlug: "bug-reports",
      status: "in-progress",
      createdBy: allUserIds[0],
      category: "Bug",
    },
    {
      title: "Search returns stale results",
      description:
        "After updating a post title, searching for the new title returns no results. The old title still appears for several minutes.",
      boardSlug: "bug-reports",
      status: "open",
      createdBy: allUserIds[1],
      category: "Bug",
    },
    {
      title: "Dashboard slow to load with 100+ posts",
      description:
        "The feedback dashboard takes 8–12 seconds to load when a board has more than 100 posts. Seems to be a missing index or N+1.",
      boardSlug: "bug-reports",
      status: "reviewing",
      createdBy: allUserIds[2],
      category: "Performance",
    },
    {
      title: "Markdown not rendering in post descriptions",
      description:
        "Bold, italic, and code blocks submitted via the public widget are saved as raw markdown strings instead of being rendered.",
      boardSlug: "bug-reports",
      status: "planned",
      createdBy: allUserIds[3],
      category: "Bug",
    },
    {
      title: "Webhook payload missing organizationId field",
      description:
        "Webhook payloads for feedback.created events no longer include the organizationId field since the last deploy.",
      boardSlug: "bug-reports",
      status: "open",
      createdBy: allUserIds[4],
      category: "Bug",
    },
    // More Integrations (idx 35–39)
    {
      title: "Jira integration",
      description:
        "Push feedback posts to Jira as issues and sync status bidirectionally so engineering and product stay in sync.",
      boardSlug: "integrations",
      status: "reviewing",
      createdBy: allUserIds[0],
      category: "Feature",
    },
    {
      title: "Notion sync",
      description:
        "Mirror feedback posts and changelogs into a Notion database so non-technical stakeholders can view and comment in their usual tool.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[1],
      category: "Feature",
    },
    {
      title: "HubSpot CRM integration",
      description:
        "Link feedback posts to HubSpot contacts and deals. Show a customer's submitted feedback directly on their CRM profile.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[2],
      category: "Feature",
    },
    {
      title: "Discord notifications",
      description:
        "Post a message to a Discord channel when a new post is created or a status changes, with configurable filters per channel.",
      boardSlug: "integrations",
      status: "planned",
      createdBy: allUserIds[3],
      category: "Feature",
    },
    {
      title: "Salesforce integration",
      description:
        "Connect Feediyo to Salesforce to surface relevant customer feedback on opportunity and account pages inside Salesforce.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[4],
      category: "Feature",
    },
  ];

  const postIds: string[] = [];

  for (const p of postDefs) {
    const id = createId();
    postIds.push(id);
    await db.insert(feedbackPosts).values({
      id,
      organizationId: orgId,
      boardId: boardIds[p.boardSlug],
      title: p.title,
      description: p.description,
      status: p.status,
      createdBy: p.createdBy,
      ...(p.category ? { categoryId: categoryIds[p.category] } : {}),
    });
  }

  console.log(`✅ Created ${postDefs.length} feedback posts`);

  // ── 6. Votes ─────────────────────────────────────────────────────────────

  let voteCount = 0;
  for (const postId of postIds) {
    const numVoters = Math.floor(Math.random() * allUserIds.length) + 1;
    const shuffled = [...allUserIds].sort(() => Math.random() - 0.5).slice(0, numVoters);
    for (const uid of shuffled) {
      await db
        .insert(votes)
        .values({ postId, userId: uid, organizationId: orgId })
        .onConflictDoNothing();
      voteCount++;
    }
  }

  console.log(`✅ Added ${voteCount} votes`);

  // ── 7. Comments ──────────────────────────────────────────────────────────

  const commentDefs = [
    {
      postIdx: 0,
      userId: allUserIds[1],
      body: "This would be huge for us. Our team works late hours and the bright UI is a strain.",
    },
    {
      postIdx: 0,
      userId: allUserIds[2],
      body: "CSS variables are already in place — shouldn't be too hard to implement!",
    },
    {
      postIdx: 0,
      userId: allUserIds[0],
      body: "Agreed, adding to next sprint. Will follow the system preference by default.",
    },
    {
      postIdx: 1,
      userId: allUserIds[3],
      body: "We have 200+ open posts from last year. Bulk updates would save us hours.",
    },
    {
      postIdx: 1,
      userId: allUserIds[4],
      body: "Could also extend this to bulk-archive or bulk-assign to boards.",
    },
    {
      postIdx: 2,
      userId: allUserIds[0],
      body: "I'd prefer a Slack notification over email personally, but digest makes sense for async teams.",
    },
    {
      postIdx: 2,
      userId: allUserIds[2],
      body: "Weekly digest with a summary of top-voted new posts would be perfect.",
    },
    {
      postIdx: 6,
      userId: allUserIds[1],
      body: "This is our most-requested feature from customers. Please prioritise!",
    },
    {
      postIdx: 6,
      userId: allUserIds[0],
      body: "Currently in development. ETA: end of this month.",
    },
    {
      postIdx: 10,
      userId: allUserIds[0],
      body: "Reproduced on Chrome 124. Looks like the optimistic update isn't wired up.",
      isInternal: true,
    },
    {
      postIdx: 10,
      userId: allUserIds[1],
      body: "Fix is in review — WebSocket connection wasn't re-established after nav.",
    },
    {
      postIdx: 15,
      userId: allUserIds[2],
      body: "We use Slack heavily. This would make the feedback loop so much tighter.",
    },
    {
      postIdx: 15,
      userId: allUserIds[3],
      body: "Would love to configure it per-board — not all channels need all feedback.",
    },
    {
      postIdx: 16,
      userId: allUserIds[4],
      body: "Linear is our primary project management tool. A two-way sync would be game-changing.",
    },
    {
      postIdx: 16,
      userId: allUserIds[0],
      body: "We're in talks with the Linear team about their API limits. More updates soon.",
    },
    // Comments on new posts
    { postIdx: 20, userId: allUserIds[1], body: "We had an incident last month where a team member changed 30 post statuses and we had no way to trace it. An audit log is critical for us." },
    { postIdx: 20, userId: allUserIds[2], body: "Even just a simple 'last updated by' field on each post would be a huge improvement over the current situation." },
    { postIdx: 20, userId: allUserIds[3], body: "Agreed — compliance teams also ask for this. It would unlock enterprise deals for us." },
    { postIdx: 21, userId: allUserIds[0], body: "We're reselling Feediyo under our own brand. Custom domain support alone would be a major unlock for our customers." },
    { postIdx: 21, userId: allUserIds[4], body: "Would love the ability to set a custom favicon too — small detail but makes a big difference for white-label setups." },
    { postIdx: 22, userId: allUserIds[3], body: "We have a significant user base in Japan and Brazil. Right now they're submitting feedback in their native language and it's getting lost." },
    { postIdx: 22, userId: allUserIds[1], body: "At minimum, auto-detecting the browser locale and showing UI strings translated would be a great start." },
    { postIdx: 23, userId: allUserIds[2], body: "We had a teammate's account compromised last quarter. 2FA would have prevented it." },
    { postIdx: 23, userId: allUserIds[4], body: "SSO would actually solve this for us but 2FA is a good interim step for teams not on an enterprise plan." },
    { postIdx: 25, userId: allUserIds[1], body: "Right now I keep 6 tabs open with different filter combos. Saved presets would replace all of that." },
    { postIdx: 25, userId: allUserIds[0], body: "Could also make saved filters shareable via URL so you can send a specific view to a teammate." },
    { postIdx: 26, userId: allUserIds[3], body: "Nested threads would make it possible to separate customer conversations from internal team discussions in the same post." },
    { postIdx: 27, userId: allUserIds[2], body: "Having a 'Bug report' template that prefills steps-to-reproduce and expected/actual behavior would cut our triage time significantly." },
    { postIdx: 28, userId: allUserIds[4], body: "I'd love to see a weekly summary widget — new posts this week, votes this week, avg time-to-close. Even a simple version would be useful." },
    { postIdx: 28, userId: allUserIds[0], body: "We have a board-by-board breakdown in a spreadsheet right now. This would replace it." },
    { postIdx: 29, userId: allUserIds[1], body: "We currently have a contributor role in GitHub — something like that would be great here." },
    { postIdx: 30, userId: allUserIds[0], body: "Changelog email subscriptions would pair nicely with the roadmap view — customers could follow progress end-to-end.", isInternal: false },
    { postIdx: 30, userId: allUserIds[2], body: "Double opt-in is a must for GDPR compliance. Happy to share our email flow as a reference." },
    { postIdx: 31, userId: allUserIds[3], body: "Confirmed on our end too. Started around Tuesday morning UTC. Checked the SMTP logs and the emails are being queued but not dispatched.", isInternal: true },
    { postIdx: 31, userId: allUserIds[1], body: "Fix is in a PR now — the queue worker stopped picking up jobs after the Redis config change. Deploy scheduled for tonight." },
    { postIdx: 32, userId: allUserIds[0], body: "Search index seems to update eventually but there's a noticeable delay. Feels like an async reindex that isn't fast enough." },
    { postIdx: 33, userId: allUserIds[4], body: "We noticed this as well. The customer-facing portal is particularly bad — loads in 14 seconds with our volume.", isInternal: false },
    { postIdx: 33, userId: allUserIds[1], body: "Ran EXPLAIN ANALYZE — there's a sequential scan on feedbackPosts that should have an index on (organizationId, boardId, status).", isInternal: true },
    { postIdx: 34, userId: allUserIds[2], body: "Our Zapier integration broke because it depends on the organizationId field for routing. Blocking for us." },
    { postIdx: 34, userId: allUserIds[0], body: "Confirmed the regression — introduced in the webhook refactor. Hotfix going out within the hour.", isInternal: true },
    { postIdx: 35, userId: allUserIds[1], body: "We use Jira for everything. Linear sync is great but most of our customers are still on Jira." },
    { postIdx: 35, userId: allUserIds[3], body: "Would need support for both Jira Cloud and Jira Server/Data Center. Our enterprise clients are mostly on the latter." },
    { postIdx: 36, userId: allUserIds[2], body: "Notion is our second brain. Having feedback posts appear there automatically would save so much copy-pasting." },
    { postIdx: 38, userId: allUserIds[4], body: "Our CRM is HubSpot. Being able to see what a lead has requested before a sales call would be a huge advantage." },
    { postIdx: 38, userId: allUserIds[0], body: "Could also go the other direction — pushing CRM data into Feediyo to enrich user profiles with deal size and lifecycle stage." },
    { postIdx: 39, userId: allUserIds[1], body: "Discord is where our dev community lives. Even a simple new-post notification would help us respond faster." },

    // ── High-engagement posts: 8–10 comments each ────────────────────────

    // postIdx 0 — "Dark mode support" (top voted, 10 comments total)
    { postIdx: 0, userId: allUserIds[3], body: "Our designers use the app all day. Dark mode is literally a health request at this point." },
    { postIdx: 0, userId: allUserIds[4], body: "System preference detection would be ideal — don't make us pick in settings, just follow the OS." },
    { postIdx: 0, userId: allUserIds[0], body: "We'll use CSS custom properties. The design tokens are already structured for it so the lift is smaller than it looks.", isInternal: true },
    { postIdx: 0, userId: allUserIds[1], body: "Will this apply to the public-facing board and widget too, or just the internal dashboard?" },
    { postIdx: 0, userId: allUserIds[2], body: "Both — the widget already has a `theme` prop that accepts 'light', 'dark', or 'auto'. Dashboard is next.", isInternal: false },
    { postIdx: 0, userId: allUserIds[3], body: "Moving this to planned. Dark mode lands in v1.6 alongside the permissions update." },
    { postIdx: 0, userId: allUserIds[4], body: "Just tested the preview build — looks great on macOS and Windows. OLED blacks on mobile are chef's kiss." },

    // postIdx 6 — "Roadmap view as public page" (in-progress, 8 comments total)
    { postIdx: 6, userId: allUserIds[3], body: "We've been asking customers to check our Notion for roadmap info. A proper public page would look so much more professional." },
    { postIdx: 6, userId: allUserIds[4], body: "Can we control which statuses show on the public view? We don't want to expose 'reviewing' items that might get cut." },
    { postIdx: 6, userId: allUserIds[0], body: "Yes — you'll be able to toggle visibility per status. 'Completed' and 'In Progress' will be on by default.", isInternal: false },
    { postIdx: 6, userId: allUserIds[2], body: "Will there be a way to embed the roadmap on our marketing site, like an iframe or a JS snippet?" },
    { postIdx: 6, userId: allUserIds[1], body: "Embed support is on the list for v1.4. The public page ships first, embed follows a week later.", isInternal: true },
    { postIdx: 6, userId: allUserIds[3], body: "Shipped! Just enabled it for our org — looks clean. Our customers are already liking it on social 🚀" },

    // postIdx 9 — "Mention teammates in comments" (in-progress, 8 comments total)
    { postIdx: 9, userId: allUserIds[0], body: "Right now I have to copy a link and paste it in Slack to loop someone in. Mentions would cut that loop entirely." },
    { postIdx: 9, userId: allUserIds[1], body: "Will it support mentioning external users (customers who submitted the post) or just internal team members?" },
    { postIdx: 9, userId: allUserIds[2], body: "Phase 1 is team members only. Customer mentions are a separate epic — involves notification consent flows.", isInternal: true },
    { postIdx: 9, userId: allUserIds[3], body: "Will mentioned users get an email if they have notifications turned off?" },
    { postIdx: 9, userId: allUserIds[4], body: "Mentions will always send an email regardless of digest setting — direct mention is a high-signal event.", isInternal: false },
    { postIdx: 9, userId: allUserIds[0], body: "PR is up for the @mention autocomplete. Uses a simple prefix search against org members.", isInternal: true },
    { postIdx: 9, userId: allUserIds[1], body: "Tested the PR — autocomplete feels snappy. One edge case: names with spaces need the full first+last to resolve correctly." },
    { postIdx: 9, userId: allUserIds[2], body: "Good catch, fixed in the latest commit. Now matches on any word in the name." },

    // postIdx 16 — "Linear sync" (reviewing, 8 comments total)
    { postIdx: 16, userId: allUserIds[2], body: "The key thing for us is bidirectional status sync. When an issue moves to 'Done' in Linear it should close the feedback post automatically." },
    { postIdx: 16, userId: allUserIds[3], body: "We also need it to respect Linear's project/team structure — not all issues should map to the same board." },
    { postIdx: 16, userId: allUserIds[4], body: "Per-board Linear team mapping would be the ideal config — Feature Requests → Product team, Bugs → Engineering team.", isInternal: false },
    { postIdx: 16, userId: allUserIds[1], body: "Will it sync existing Linear issues back as feedback posts, or only push new ones created from Feediyo?" },
    { postIdx: 16, userId: allUserIds[0], body: "Initial release is push-only (Feediyo → Linear). Pull sync is complex and would ship in a follow-up.", isInternal: true },
    { postIdx: 16, userId: allUserIds[2], body: "That's fine for our use case. We just need posts to create issues — the team lives in Linear anyway." },

    // postIdx 35 — "Jira integration" (reviewing, 8 comments total)
    { postIdx: 35, userId: allUserIds[2], body: "We're a Jira shop. Our PMs live there and they won't switch tools — bringing feedback into Jira is the only way they'll actually see it." },
    { postIdx: 35, userId: allUserIds[4], body: "Would this support custom Jira fields? We have a mandatory 'customer impact' field that every issue needs filled." },
    { postIdx: 35, userId: allUserIds[0], body: "Custom field mapping is planned for the Jira config step — you'll be able to map Feediyo attributes to any Jira field.", isInternal: false },
    { postIdx: 35, userId: allUserIds[1], body: "Does it handle Jira Server/Data Center or only Jira Cloud? Most of our enterprise clients are still on Server." },
    { postIdx: 35, userId: allUserIds[2], body: "Jira Cloud first. Server/DC requires a different auth model (OAuth 1.0) — we'll tackle it in a follow-on release.", isInternal: true },
    { postIdx: 35, userId: allUserIds[3], body: "Cloud is fine for us. Just confirming — will status changes in Jira sync back and update the post status here?" },
    { postIdx: 35, userId: allUserIds[4], body: "Yes — via Jira webhooks. When an issue transitions, it fires back to Feediyo and we update the post status accordingly." },
  ];

  for (const c of commentDefs) {
    await db.insert(comments).values({
      postId: postIds[c.postIdx],
      organizationId: orgId,
      userId: c.userId,
      body: c.body,
      isInternal: c.isInternal ?? false,
    });
  }

  console.log(`✅ Added ${commentDefs.length} comments`);

  // ── 7.5. Post Tags ───────────────────────────────────────────────────────

  const postTagDefs = [
    { postIdx: 0, tags: ["customer-request", "quick-win"] },      // Dark mode support
    { postIdx: 5, tags: ["quick-win"] },                           // CSV export
    { postIdx: 6, tags: ["customer-request", "high-priority"] },  // Roadmap view
    { postIdx: 9, tags: ["needs-design"] },                        // Mention teammates
    { postIdx: 10, tags: ["high-priority", "customer-request"] }, // Vote count bug
    { postIdx: 13, tags: ["high-priority"] },                      // Safari redirect loop
    { postIdx: 14, tags: ["high-priority"] },                      // Widget Firefox bug
    { postIdx: 15, tags: ["customer-request"] },                   // Slack integration
    { postIdx: 21, tags: ["customer-request"] },                   // Custom branding
    { postIdx: 23, tags: ["high-priority", "customer-request"] }, // 2FA
    { postIdx: 27, tags: ["customer-request"] },                   // Analytics dashboard
    { postIdx: 29, tags: ["customer-request", "needs-design"] },  // Changelog subscriptions
    { postIdx: 30, tags: ["high-priority"] },                      // Email notifications bug
    { postIdx: 32, tags: ["high-priority", "breaking-change"] },  // Dashboard slow
    { postIdx: 35, tags: ["customer-request"] },                   // Jira
    { postIdx: 39, tags: ["quick-win", "customer-request"] },     // Discord notifications
  ];

  let postTagCount = 0;
  for (const pt of postTagDefs) {
    for (const tagName of pt.tags) {
      await db
        .insert(postTags)
        .values({ postId: postIds[pt.postIdx], tagId: tagIds[tagName], addedByUserId: johnId })
        .onConflictDoNothing();
      postTagCount++;
    }
  }
  console.log(`✅ Added ${postTagCount} post tags`);

  // ── 8. Reactions ─────────────────────────────────────────────────────────

  const reactionTypes = ["heart", "rocket", "eyes", "thumbsup"];
  let reactionCount = 0;

  for (const postId of postIds.slice(0, 10)) {
    const numReactions = Math.floor(Math.random() * 3) + 1;
    const shuffledUsers = [...allUserIds].sort(() => Math.random() - 0.5).slice(0, numReactions);
    for (const uid of shuffledUsers) {
      const type = reactionTypes[Math.floor(Math.random() * reactionTypes.length)];
      await db
        .insert(reactions)
        .values({ postId, userId: uid, organizationId: orgId, type })
        .onConflictDoNothing();
      reactionCount++;
    }
  }

  console.log(`✅ Added ${reactionCount} reactions`);

  // ── 9. Post Activities ───────────────────────────────────────────────────

  const statusTransitions = [
    { postIdx: 1, fromStatus: "open", toStatus: "reviewing" },
    { postIdx: 6, fromStatus: "open", toStatus: "planned" },
    { postIdx: 6, fromStatus: "planned", toStatus: "in-progress" },
    { postIdx: 9, fromStatus: "open", toStatus: "in-progress" },
    { postIdx: 5, fromStatus: "open", toStatus: "planned" },
    { postIdx: 5, fromStatus: "planned", toStatus: "completed" },
    { postIdx: 10, fromStatus: "open", toStatus: "reviewing" },
    { postIdx: 10, fromStatus: "reviewing", toStatus: "in-progress" },
    { postIdx: 11, fromStatus: "open", toStatus: "completed" },
    { postIdx: 13, fromStatus: "open", toStatus: "planned" },
    { postIdx: 15, fromStatus: "open", toStatus: "planned" },
    { postIdx: 16, fromStatus: "open", toStatus: "reviewing" },
    { postIdx: 21, fromStatus: "open", toStatus: "planned" },
    { postIdx: 23, fromStatus: "open", toStatus: "planned" },
    { postIdx: 25, fromStatus: "open", toStatus: "reviewing" },
    { postIdx: 27, fromStatus: "open", toStatus: "planned" },
    { postIdx: 29, fromStatus: "open", toStatus: "planned" },
    { postIdx: 29, fromStatus: "planned", toStatus: "in-progress" },
    { postIdx: 30, fromStatus: "open", toStatus: "in-progress" },
    { postIdx: 32, fromStatus: "open", toStatus: "reviewing" },
    { postIdx: 33, fromStatus: "open", toStatus: "planned" },
    { postIdx: 35, fromStatus: "open", toStatus: "reviewing" },
    { postIdx: 38, fromStatus: "open", toStatus: "planned" },
  ];

  for (const t of statusTransitions) {
    await db.insert(postActivities).values({
      postId: postIds[t.postIdx],
      organizationId: orgId,
      userId: johnId,
      type: "status_changed",
      oldValue: t.fromStatus,
      newValue: t.toStatus,
    });
  }

  console.log(`✅ Added ${statusTransitions.length} post activity entries`);

  // ── 10. Changelogs ───────────────────────────────────────────────────────

  const changelogDefs = [
    {
      title: "v1.0 — We're live",
      slug: "v1-0-launch",
      status: "published",
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      body: JSON.stringify([
        bn("h1", "heading", "Feediyo is officially live", { level: 2 }),
        bn("p1", "paragraph", "After months of development, our public feedback boards are ready for your customers."),
        bn("l1", "bulletListItem", "Public and private feedback boards"),
        bn("l2", "bulletListItem", "Voting and commenting"),
        bn("l3", "bulletListItem", "Status workflows: open, reviewing, planned, in-progress, completed"),
        bn("l4", "bulletListItem", "Embeddable widget for your app"),
      ]),
    },
    {
      title: "v1.1 — Performance & Stability",
      slug: "v1-1-performance-stability",
      status: "published",
      publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      body: JSON.stringify([
        bn("h1", "heading", "Faster and more reliable", { level: 2 }),
        bn("p1", "paragraph", "This release focuses entirely on speed and stability based on early feedback."),
        bn("l1", "bulletListItem", "Board view load time reduced by 60%"),
        bn("l2", "bulletListItem", "Fixed session expiry bug causing random logouts"),
        bn("l3", "bulletListItem", "Vote button now responds instantly with optimistic updates"),
        bn("l4", "bulletListItem", "Improved error messages across all forms"),
      ]),
    },
    {
      title: "v1.2 — Widget Improvements",
      slug: "v1-2-widget-improvements",
      status: "published",
      publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      body: JSON.stringify([
        bn("h1", "heading", "Widget v2", { level: 2 }),
        bn("p1", "paragraph", "The embedded widget has been completely rewritten for better performance and reliability."),
        bn("l1", "bulletListItem", "50% smaller bundle size"),
        bn("l2", "bulletListItem", "Fixed CORS issues on Firefox"),
        bn("l3", "bulletListItem", "New position and theme options"),
      ]),
    },
    {
      title: "v1.3 — Roadmap & CSV Export",
      slug: "v1-3-roadmap-csv-export",
      status: "published",
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      body: JSON.stringify([
        bn("h1", "heading", "What's new in v1.3", { level: 2 }),
        bn("p1", "paragraph", "We shipped two of our most-requested features this week."),
        bn("l1", "bulletListItem", "Public roadmap page now available"),
        bn("l2", "bulletListItem", "CSV export for all feedback posts"),
        bn("l3", "bulletListItem", "Performance improvements to the board view"),
      ]),
    },
    {
      title: "v1.4 — Mentions & Notifications",
      slug: "v1-4-mentions-notifications",
      status: "published",
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      body: JSON.stringify([
        bn("h1", "heading", "Collaborate better", { level: 2 }),
        bn("p1", "paragraph", "@mention teammates in comments to loop them in directly."),
        bn("l1", "bulletListItem", "@mention support in comments"),
        bn("l2", "bulletListItem", "Email notifications for mentions and replies"),
        bn("l3", "bulletListItem", "In-app notification bell with unread count"),
      ]),
    },
    {
      title: "v1.5 — Segments & User Profiles",
      slug: "v1-5-segments-user-profiles",
      status: "published",
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      body: JSON.stringify([
        bn("h1", "heading", "Know who's giving you feedback", { level: 2 }),
        bn("p1", "paragraph", "You can now identify users via the API and segment them by plan, role, industry, and more."),
        bn("l1", "bulletListItem", "User profile identification via API"),
        bn("l2", "bulletListItem", "Segment builder with plan, role, location, and company size filters"),
        bn("l3", "bulletListItem", "Voter trait breakdown on each feedback post"),
        bn("l4", "bulletListItem", "Filter feedback views by segment"),
      ]),
    },
    {
      title: "v1.6 — Analytics & Permissions",
      slug: "v1-6-analytics-permissions",
      status: "draft",
      publishedAt: null,
      body: JSON.stringify([
        bn("h1", "heading", "Coming next", { level: 2 }),
        bn("p1", "paragraph", "Our next release brings a new analytics dashboard and custom role support."),
        bn("l1", "bulletListItem", "Feedback analytics dashboard with volume and trend charts"),
        bn("l2", "bulletListItem", "Custom roles: viewer, moderator, contributor"),
        bn("l3", "bulletListItem", "Saved search filter presets"),
      ]),
    },
    {
      title: "v2.0 — Reimagined Dashboard",
      slug: "v2-0-reimagined-dashboard",
      status: "draft",
      publishedAt: null,
      body: JSON.stringify([
        bn("h1", "heading", "v2 is coming", { level: 2 }),
        bn("p1", "paragraph", "We're working on a completely redesigned dashboard experience. Here's a sneak peek."),
        bn("l1", "bulletListItem", "New command palette for instant navigation"),
        bn("l2", "bulletListItem", "Resizable panel layout"),
        bn("l3", "bulletListItem", "Bulk actions toolbar"),
        bn("l4", "bulletListItem", "AI-powered feedback summaries"),
      ]),
    },
  ];

  for (const cl of changelogDefs) {
    await db.insert(changelogs).values({
      organizationId: orgId,
      title: cl.title,
      slug: cl.slug,
      body: cl.body,
      status: cl.status,
      createdBy: johnId,
      publishedAt: cl.publishedAt,
    });
  }

  console.log(`✅ Created ${changelogDefs.length} changelogs (6 published, 2 drafts)`);

  // ── 10.5. Changelog Tags ─────────────────────────────────────────────────

  const changelogTagDefs = ["bug fix", "documentation", "new feature", "security update", "announcement"];
  for (const name of changelogTagDefs) {
    await db.insert(changelogTags).values({ organizationId: orgId, name });
  }
  console.log(`✅ Created ${changelogTagDefs.length} changelog tags`);

  // ── 11. Widget Config ────────────────────────────────────────────────────

  await db.insert(widgetConfigs).values({
    organizationId: orgId,
    boardId: boardIds["feature-requests"],
    enabled: true,
    position: "right",
    theme: "auto",
    allowedOrigins: "https://acmecorp.dev,http://localhost:3000",
  });

  console.log("✅ Created widget config");

  // ── 11.5. Feedback Views ─────────────────────────────────────────────────
  // Mirrors the DEFAULT_VIEWS from features/dashboard/server/views.server.ts
  // plus one custom view so the custom-view path is exercisable in dev.

  const viewDefs = [
    { name: "Triage queue", emoji: "🔥", isSystem: true, sort: "newest", order: 0, filters: { status: ["open"] } },
    { name: "Needs review", emoji: "👀", isSystem: true, sort: "oldest", order: 1, filters: { status: ["reviewing"] } },
    { name: "Ready to ship", emoji: "🚀", isSystem: true, sort: "votes", order: 2, filters: { status: ["planned"] } },
    {
      name: "Customer waiting",
      emoji: "⏱️",
      isSystem: true,
      sort: "oldest",
      order: 3,
      filters: { hasCustomerComment: true, excludeStatus: ["completed", "closed"], minAge: 7 },
    },
    {
      name: "Recently completed",
      emoji: "✅",
      isSystem: true,
      sort: "newest",
      order: 4,
      filters: { status: ["completed"], maxAge: 7 },
    },
    {
      name: "Integration asks",
      emoji: "🔌",
      isSystem: false,
      sort: "votes",
      order: 5,
      filters: { boardId: [boardIds["integrations"]] },
    },
  ];

  for (const v of viewDefs) {
    await db.insert(feedbackViews).values({
      organizationId: orgId,
      name: v.name,
      emoji: v.emoji,
      isSystem: v.isSystem,
      sort: v.sort,
      order: v.order,
      filters: JSON.stringify(v.filters),
    });
  }
  console.log(`✅ Created ${viewDefs.length} feedback views (5 system + 1 custom)`);

  // ── 12. Webhook Endpoints ────────────────────────────────────────────────

  const webhookDefs = [
    {
      name: "Slack Notifications",
      url: "https://hooks.slack.com/services/T000EXAMPLE/B000EXAMPLE/xxxxxxxxxxxxxxxxxxxx",
      secret: "whsec_dev_slack_sample_secret_key_1234",
      events: '["feedback.created","feedback.status_changed"]',
      isActive: true,
    },
    {
      name: "Zapier Catch-all",
      url: "https://hooks.zapier.com/hooks/catch/0000000/xxxxxxx",
      secret: "whsec_dev_zapier_sample_secret_key_5678",
      events: '["*"]',
      isActive: false,
    },
  ];

  for (const w of webhookDefs) {
    await db.insert(webhookEndpoints).values({ organizationId: orgId, ...w });
  }
  console.log(`✅ Created ${webhookDefs.length} webhook endpoints`);

  // ── 13. Post External Links (GitHub) ────────────────────────────────────

  const externalLinkDefs = [
    {
      postIdx: 10, // "Vote count not updating in real-time"
      externalId: "42",
      externalUrl: "https://github.com/acme-corp/acme-app/issues/42",
      identifier: "#42",
      externalTitle: "Vote count not updating in real-time",
      externalStatus: "open",
      metadata: JSON.stringify({ issueNumber: 42, repoOwner: "acme-corp", repoName: "acme-app" }),
    },
    {
      postIdx: 11, // "Long post titles overflow the card"
      externalId: "38",
      externalUrl: "https://github.com/acme-corp/acme-app/issues/38",
      identifier: "#38",
      externalTitle: "Long post titles overflow on small screens",
      externalStatus: "closed",
      metadata: JSON.stringify({ issueNumber: 38, repoOwner: "acme-corp", repoName: "acme-app" }),
    },
    {
      postIdx: 14, // "Widget not loading on Firefox"
      externalId: "51",
      externalUrl: "https://github.com/acme-corp/acme-app/issues/51",
      identifier: "#51",
      externalTitle: "Widget fails to render on Firefox 124+",
      externalStatus: "open",
      metadata: JSON.stringify({ issueNumber: 51, repoOwner: "acme-corp", repoName: "acme-app" }),
    },
  ];

  for (const el of externalLinkDefs) {
    await db.insert(postExternalLinks).values({
      postId: postIds[el.postIdx],
      organizationId: orgId,
      provider: "github",
      externalId: el.externalId,
      externalUrl: el.externalUrl,
      identifier: el.identifier,
      externalTitle: el.externalTitle,
      externalStatus: el.externalStatus,
      linkedByUserId: johnId,
      metadata: el.metadata,
      lastSyncedAt: new Date(),
    });
  }
  console.log(`✅ Created ${externalLinkDefs.length} post external links (GitHub)`);

  // ── 14. GitHub Integration ───────────────────────────────────────────────

  await db.insert(integrations).values({
    organizationId: orgId,
    provider: "github",
    connectedByUserId: johnId,
    settings: JSON.stringify({ installationId: "12345678", repoOwner: "acme-corp", repoName: "acme-app" }),
    enabled: true,
  });
  console.log("✅ Created GitHub integration (simulated)");

  // ── 15. User Profiles ────────────────────────────────────────────────────
  // Linked profiles for the 5 seeded users + 5 anonymous external profiles.

  const profileDefs = [
    // Linked to seeded users
    {
      email: "johndoe@gmail.com",
      userId: userIds["johndoe@gmail.com"],
      name: "John Doe",
      externalId: "cus_john01",
      plan: "paying",
      role: "founder",
      industry: "SaaS",
      location: "North America",
      companySize: 12,
    },
    {
      email: "alice@acmecorp.dev",
      userId: userIds["alice@acmecorp.dev"],
      name: "Alice Chen",
      externalId: "cus_alice02",
      plan: "paying",
      role: "product manager",
      industry: "SaaS",
      location: "North America",
      companySize: 45,
    },
    {
      email: "bob@acmecorp.dev",
      userId: userIds["bob@acmecorp.dev"],
      name: "Bob Martinez",
      externalId: "cus_bob03",
      plan: "trial",
      role: "developer",
      industry: "ecommerce",
      location: "Europe",
      companySize: 8,
    },
    {
      email: "sara@acmecorp.dev",
      userId: userIds["sara@acmecorp.dev"],
      name: "Sara Kim",
      externalId: "cus_sara04",
      plan: "free",
      role: "designer",
      industry: "healthcare",
      location: "Asia Pacific",
      companySize: 3,
    },
    {
      email: "dave@acmecorp.dev",
      userId: userIds["dave@acmecorp.dev"],
      name: "Dave Patel",
      externalId: "cus_dave05",
      plan: "churned",
      role: "founder",
      industry: "fintech",
      location: "Europe",
      companySize: 20,
    },
    // External / widget-identified profiles (no userId)
    { email: "priya@startupco.io",    externalId: "cus_ext01", name: "Priya Nair",       plan: "paying",  role: "founder",          industry: "SaaS",        location: "Asia Pacific",  companySize: 6   },
    { email: "marco@retailshop.eu",   externalId: "cus_ext02", name: "Marco Rossi",      plan: "trial",   role: "developer",        industry: "ecommerce",   location: "Europe",        companySize: 15  },
    { email: "lisa@healthapp.com",    externalId: "cus_ext03", name: "Lisa Turner",      plan: "free",    role: "product manager",  industry: "healthcare",  location: "North America", companySize: 50  },
    { email: "chen@bigcorp.cn",       externalId: "cus_ext04", name: "Chen Wei",         plan: "paying",  role: "engineer",         industry: "fintech",     location: "Asia Pacific",  companySize: 200 },
    { email: "james@agency.io",       externalId: "cus_ext05", name: "James O'Brien",    plan: "churned", role: "founder",          industry: "SaaS",        location: "Europe",        companySize: 4   },
    { email: "nina@logistix.de",      externalId: "cus_ext06", name: "Nina Weber",       plan: "paying",  role: "operations",       industry: "logistics",   location: "Europe",        companySize: 80  },
    { email: "raj@devtools.in",       externalId: "cus_ext07", name: "Raj Sharma",       plan: "trial",   role: "developer",        industry: "SaaS",        location: "Asia Pacific",  companySize: 3   },
    { email: "sofia@edtech.br",       externalId: "cus_ext08", name: "Sofia Mendes",     plan: "free",    role: "founder",          industry: "edtech",      location: "South America", companySize: 7   },
    { email: "tom@bigretail.com",     externalId: "cus_ext09", name: "Tom Bradley",      plan: "paying",  role: "product manager",  industry: "ecommerce",   location: "North America", companySize: 340 },
    { email: "yuki@finwise.jp",       externalId: "cus_ext10", name: "Yuki Tanaka",      plan: "paying",  role: "founder",          industry: "fintech",     location: "Asia Pacific",  companySize: 22  },
    { email: "fatima@mednow.ae",      externalId: "cus_ext11", name: "Fatima Al-Rashid", plan: "trial",   role: "operations",       industry: "healthcare",  location: "Middle East",   companySize: 110 },
    { email: "lucas@growthco.fr",     externalId: "cus_ext12", name: "Lucas Bernard",    plan: "churned", role: "marketer",         industry: "SaaS",        location: "Europe",        companySize: 9   },
    { email: "alex@cloudbuild.io",    externalId: "cus_ext13", name: "Alex Morgan",      plan: "paying",  role: "developer",        industry: "SaaS",        location: "North America", companySize: 17  },
    { email: "ingrid@nordshop.se",    externalId: "cus_ext14", name: "Ingrid Larsson",   plan: "free",    role: "designer",         industry: "ecommerce",   location: "Europe",        companySize: 5   },
    { email: "kwame@fintech-gh.com",  externalId: "cus_ext15", name: "Kwame Asante",     plan: "trial",   role: "founder",          industry: "fintech",     location: "Africa",        companySize: 12  },
    { email: "claire@saashq.co",      externalId: "cus_ext16", name: "Claire Dupont",    plan: "paying",  role: "product manager",  industry: "SaaS",        location: "Europe",        companySize: 38  },
    { email: "ravi@logismart.in",     externalId: "cus_ext17", name: "Ravi Krishnan",    plan: "paying",  role: "engineer",         industry: "logistics",   location: "Asia Pacific",  companySize: 60  },
    { email: "mia@contentpro.au",     externalId: "cus_ext18", name: "Mia Thompson",     plan: "free",    role: "marketer",         industry: "media",       location: "Asia Pacific",  companySize: 2   },
    { email: "carlos@enterprise.mx",  externalId: "cus_ext19", name: "Carlos Vega",      plan: "paying",  role: "operations",       industry: "logistics",   location: "South America", companySize: 500 },
    { email: "anna@healthsuite.pl",   externalId: "cus_ext20", name: "Anna Kowalski",    plan: "churned", role: "product manager",  industry: "healthcare",  location: "Europe",        companySize: 25  },
  ];

  for (const p of profileDefs) {
    await db.insert(userProfiles).values({
      id: createId(),
      organizationId: orgId,
      userId: p.userId ?? null,
      externalId: p.externalId,
      email: p.email,
      name: p.name,
      plan: p.plan,
      role: p.role,
      industry: p.industry,
      location: p.location,
      companySize: p.companySize,
    });
  }

  console.log(`✅ Created ${profileDefs.length} user profiles`);

  // ── 16. Segments ─────────────────────────────────────────────────────────

  const segmentDefs = [
    {
      name: "Paying customers",
      color: "#22c55e",
      filters: { plan: ["paying"] },
    },
    {
      name: "Free tier",
      color: "#64748b",
      filters: { plan: ["free"] },
    },
    {
      name: "Churned users",
      color: "#ef4444",
      filters: { plan: ["churned"] },
    },
    {
      name: "SaaS founders",
      color: "#6366f1",
      filters: { plan: ["paying", "trial"], role: ["founder"], industry: ["SaaS"] },
    },
    {
      name: "European users",
      color: "#f97316",
      filters: { location: ["Europe"] },
    },
    {
      name: "Enterprise (20+ employees)",
      color: "#8b5cf6",
      filters: { minCompanySize: 20 },
    },
  ];

  for (const s of segmentDefs) {
    await db.insert(segments).values({
      id: createId(),
      organizationId: orgId,
      name: s.name,
      color: s.color,
      filters: JSON.stringify(s.filters),
    });
  }

  console.log(`✅ Created ${segmentDefs.length} segments`);

  // ── Done ─────────────────────────────────────────────────────────────────

  console.log(`
✨ Seed complete!

  Login:     johndoe@gmail.com / password
  Org:       Acme Corp (slug: acme-corp)
  Team:      5 members  |  3 boards  |  ${postDefs.length} posts
  Taxonomy:  ${categoryDefs.length} categories  |  ${tagDefs.length} feedback tags  |  ${changelogTagDefs.length} changelog tags
  Views:     ${viewDefs.length} feedback views (5 system + 1 custom)
  Segments:  ${segmentDefs.length} segments  |  ${profileDefs.length} user profiles (5 linked + 20 external)
  Dev data:  2 webhook endpoints  |  3 GitHub external links  |  1 GitHub integration
`);

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  pool.end();
  process.exit(1);
});
