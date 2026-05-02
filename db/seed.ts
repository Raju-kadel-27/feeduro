// @ts-nocheck
import { createId } from "@paralleldrive/cuid2";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import {
  changelogs,
  comments,
  feedbackBoards,
  feedbackPosts,
  postActivities,
  reactions,
  votes,
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

  // ── 3. Members ───────────────────────────────────────────────────────────

  for (const [email, uid] of Object.entries(userIds)) {
    await db
      .insert(member)
      .values({
        id: createId(),
        organizationId: orgId,
        userId: uid,
        role: email === "johndoe@gmail.com" ? "admin" : "member",
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  }

  console.log("✅ Members ready");

  // ── Clear transient data so re-runs always get fresh state ───────────────

  await db.delete(postActivities).where(eq(postActivities.organizationId, orgId));
  await db.delete(reactions).where(eq(reactions.organizationId, orgId));
  await db.delete(votes).where(eq(votes.organizationId, orgId));
  await db.delete(comments).where(eq(comments.organizationId, orgId));
  await db.delete(feedbackPosts).where(eq(feedbackPosts.organizationId, orgId));
  await db.delete(feedbackBoards).where(eq(feedbackBoards.organizationId, orgId));
  await db.delete(changelogs).where(eq(changelogs.organizationId, orgId));
  await db.delete(widgetConfigs).where(eq(widgetConfigs.organizationId, orgId));

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
    },
    {
      title: "Bulk status update for posts",
      description:
        "Allow admins to select multiple posts and update their status in one action instead of one by one.",
      boardSlug: "feature-requests",
      status: "reviewing",
      createdBy: allUserIds[1],
    },
    {
      title: "Email digest for new feedback",
      description:
        "Send a daily or weekly email summary of new feedback posts to team members so nothing gets missed.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[2],
    },
    {
      title: "Keyboard shortcuts",
      description:
        "Add keyboard shortcuts for common actions like opening posts, changing status, and navigating between boards.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[3],
    },
    {
      title: "Custom post statuses",
      description: "Allow organizations to define their own post statuses beyond the defaults.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[4],
    },
    {
      title: "CSV export of all feedback",
      description:
        "Export all feedback posts with votes, comments, and status as a CSV file for reporting.",
      boardSlug: "feature-requests",
      status: "completed",
      createdBy: allUserIds[1],
    },
    {
      title: "Roadmap view as public page",
      description:
        "Share a public-facing roadmap page that shows planned and in-progress items to customers.",
      boardSlug: "feature-requests",
      status: "in-progress",
      createdBy: allUserIds[0],
    },
    {
      title: "Pin important posts to top",
      description:
        "Let admins pin high-priority posts to the top of the board so they stay visible.",
      boardSlug: "feature-requests",
      status: "planned",
      createdBy: allUserIds[2],
    },
    {
      title: "Mobile app",
      description: "A native iOS and Android app for managing feedback on the go.",
      boardSlug: "feature-requests",
      status: "open",
      createdBy: allUserIds[3],
    },
    {
      title: "Mention teammates in comments",
      description:
        "Use @username to mention team members in comments and trigger email notifications.",
      boardSlug: "feature-requests",
      status: "in-progress",
      createdBy: allUserIds[4],
    },
    // Bug Reports
    {
      title: "Vote count not updating in real-time",
      description: "When I upvote a post, the count doesn't update until I refresh the page.",
      boardSlug: "bug-reports",
      status: "in-progress",
      createdBy: allUserIds[2],
    },
    {
      title: "Long post titles overflow the card",
      description:
        "On the board view, post titles longer than ~80 characters break the card layout on smaller screens.",
      boardSlug: "bug-reports",
      status: "completed",
      createdBy: allUserIds[3],
    },
    {
      title: "Can't remove a vote once cast",
      description:
        "After voting on a post, there's no way to undo it. Clicking the vote button again does nothing.",
      boardSlug: "bug-reports",
      status: "reviewing",
      createdBy: allUserIds[0],
    },
    {
      title: "Sign-in redirect loop on Safari",
      description:
        "On Safari 17, after signing in with Google I get redirected back to the sign-in page in a loop.",
      boardSlug: "bug-reports",
      status: "planned",
      createdBy: allUserIds[1],
    },
    {
      title: "Widget not loading on Firefox",
      description:
        "The embedded feedback widget fails to render on Firefox 124+. Console shows a CORS error.",
      boardSlug: "bug-reports",
      status: "open",
      createdBy: allUserIds[4],
    },
    // Integrations
    {
      title: "Slack integration for new posts",
      description:
        "Post a Slack message to a chosen channel whenever a new feedback post is created.",
      boardSlug: "integrations",
      status: "planned",
      createdBy: allUserIds[0],
    },
    {
      title: "Linear sync",
      description:
        "Two-way sync with Linear — convert feedback posts to issues and reflect status changes back.",
      boardSlug: "integrations",
      status: "reviewing",
      createdBy: allUserIds[1],
    },
    {
      title: "Zapier integration",
      description: "Trigger Zaps when a post is created, status changes, or a comment is added.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[2],
    },
    {
      title: "Intercom widget embed",
      description:
        "Allow embedding the feedback widget inside the Intercom messenger for seamless in-app feedback.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[3],
    },
    {
      title: "GitHub Issues sync",
      description:
        "Automatically create GitHub issues from feedback posts and sync status bidirectionally.",
      boardSlug: "integrations",
      status: "open",
      createdBy: allUserIds[4],
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
      title: "v1.2 — Widget Improvements",
      slug: "v1-2-widget-improvements",
      status: "published",
      publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      body: JSON.stringify([
        bn("h1", "heading", "Widget v2", { level: 2 }),
        bn(
          "p1",
          "paragraph",
          "The embedded widget has been completely rewritten for better performance and reliability.",
        ),
        bn("l1", "bulletListItem", "50% smaller bundle size"),
        bn("l2", "bulletListItem", "Fixed CORS issues on Firefox"),
        bn("l3", "bulletListItem", "New position and theme options"),
      ]),
    },
    {
      title: "v1.4 — Mentions & Notifications",
      slug: "v1-4-mentions-notifications",
      status: "draft",
      publishedAt: null,
      body: JSON.stringify([
        bn("h1", "heading", "Coming soon", { level: 2 }),
        bn(
          "p1",
          "paragraph",
          "@mention teammates in comments to loop them in. Email notifications will follow.",
        ),
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

  console.log("✅ Created 3 changelogs (2 published, 1 draft)");

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

  // ── Done ─────────────────────────────────────────────────────────────────

  console.log(`
✨ Seed complete!

  Login: johndoe@gmail.com / password
  Org:   Acme Corp (slug: acme-corp)
  Team:  5 members  |  3 boards  |  ${postDefs.length} posts
`);

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  pool.end();
  process.exit(1);
});
