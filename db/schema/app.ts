import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { organization } from "./better-auth";

// ============ Enums ============

export const boardVisibilityEnum = pgEnum("board_visibility", ["public", "private"]);
export const postStatusEnum = pgEnum("post_status", [
  "open",
  "reviewing",
  "planned",
  "in-progress",
  "completed",
  "closed",
]);
export const domainStatusEnum = pgEnum("domain_status", ["pending", "active", "failed"]);
export const changelogStatusEnum = pgEnum("changelog_status", ["draft", "published"]);
export const widgetPositionEnum = pgEnum("widget_position", ["left", "right"]);
export const widgetThemeEnum = pgEnum("widget_theme", ["light", "dark", "auto"]);

// ============ Subscription (Stripe + Dodo — managed here due to custom columns) ============

export const subscription = pgTable(
  "subscription",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    plan: varchar("plan", { length: 50 }).notNull(),
    referenceId: varchar("reference_id", { length: 255 }).notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("incomplete"),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    cancelAt: timestamp("cancel_at"),
    canceledAt: timestamp("canceled_at"),
    endedAt: timestamp("ended_at"),
    seats: integer("seats"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    billingInterval: varchar("billing_interval", { length: 20 }),
    stripeScheduleId: varchar("stripe_schedule_id", { length: 255 }),
    dodoCustomerId: varchar("dodo_customer_id", { length: 255 }),
    dodoSubscriptionId: varchar("dodo_subscription_id", { length: 255 }),
  },
  (t) => ({
    referenceIdIdx: index("subscription_reference_id_idx").on(t.referenceId),
    stripeSubIdx: index("subscription_stripe_sub_idx").on(t.stripeSubscriptionId),
    dodoSubIdx: index("subscription_dodo_sub_idx").on(t.dodoSubscriptionId),
  }),
);

// ============ App Tables ============

export const feedbackBoards = pgTable(
  "feedback_boards",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    visibility: boardVisibilityEnum("visibility").notNull().default("public"),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: varchar("created_by", { length: 36 }).notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("fb_org_id_idx").on(t.organizationId),
    orgSlugUniqueIdx: uniqueIndex("fb_org_slug_unique_idx").on(t.organizationId, t.slug),
  }),
);

export const feedbackPosts = pgTable(
  "feedback_posts",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    boardId: varchar("board_id", { length: 128 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: postStatusEnum("status").notNull().default("open"),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    submitterEmail: varchar("submitter_email", { length: 255 }),
    submitterName: varchar("submitter_name", { length: 255 }),
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: varchar("github_issue_url", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("fp_org_id_idx").on(t.organizationId),
    orgStatusIdx: index("fp_org_status_idx").on(t.organizationId, t.status),
    boardIdIdx: index("fp_board_id_idx").on(t.boardId),
    boardStatusIdx: index("fp_board_status_idx").on(t.boardId, t.status),
  }),
);

export const votes = pgTable(
  "votes",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueVote: uniqueIndex("unique_vote_idx").on(t.postId, t.userId),
    postIdIdx: index("votes_post_id_idx").on(t.postId),
    orgIdIdx: index("votes_org_id_idx").on(t.organizationId),
  }),
);

export const comments = pgTable(
  "comments",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 }).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    parentId: varchar("parent_id", { length: 128 }),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    postIdIdx: index("comments_post_id_idx").on(t.postId),
    orgIdIdx: index("comments_org_id_idx").on(t.organizationId),
    parentIdIdx: index("comments_parent_id_idx").on(t.parentId),
  }),
);

export const customDomains = pgTable(
  "custom_domains",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 253 }).notNull(),
    status: domainStatusEnum("status").notNull().default("pending"),
    verificationToken: varchar("verification_token", { length: 64 }).notNull(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    domainUniqueIdx: uniqueIndex("custom_domain_unique_idx").on(t.domain),
    orgUniqueIdx: uniqueIndex("custom_domain_org_unique_idx").on(t.organizationId),
  }),
);

export const changelogs = pgTable(
  "changelogs",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull().default(""),
    body: text("body").notNull().default("[]"),
    status: changelogStatusEnum("status").notNull().default("draft"),
    createdBy: varchar("created_by", { length: 36 }).notNull().default(""),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("changelogs_org_id_idx").on(t.organizationId),
    orgSlugUniqueIdx: uniqueIndex("changelogs_org_slug_unique_idx").on(t.organizationId, t.slug),
    orgStatusIdx: index("changelogs_org_status_idx").on(t.organizationId, t.status),
  }),
);

export const reactions = pgTable(
  "reactions",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    type: varchar("type", { length: 50 }).notNull().default("heart"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueReaction: uniqueIndex("unique_reaction_idx").on(t.postId, t.userId, t.type),
    postIdIdx: index("reactions_post_id_idx").on(t.postId),
    orgIdIdx: index("reactions_org_id_idx").on(t.organizationId),
  }),
);

export const postActivities = pgTable(
  "post_activities",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 }).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    type: varchar("type", { length: 50 }).notNull().default("status_changed"),
    oldValue: varchar("old_value", { length: 100 }),
    newValue: varchar("new_value", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    postIdIdx: index("pa_post_id_idx").on(t.postId),
    orgIdIdx: index("pa_org_id_idx").on(t.organizationId),
  }),
);

export const changelogTags = pgTable(
  "changelog_tags",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("changelog_tags_org_id_idx").on(t.organizationId),
    orgNameUniqueIdx: uniqueIndex("changelog_tags_org_name_unique_idx").on(
      t.organizationId,
      t.name,
    ),
  }),
);

export const widgetConfigs = pgTable(
  "widget_configs",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 128 })
      .notNull()
      .$defaultFn(() => createId()),
    signingSecret: varchar("signing_secret", { length: 64 }),
    enabled: boolean("enabled").notNull().default(true),
    boardId: varchar("board_id", { length: 128 }),
    position: widgetPositionEnum("position").notNull().default("right"),
    theme: widgetThemeEnum("theme").notNull().default("auto"),
    allowedOrigins: text("allowed_origins"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    tokenIdx: uniqueIndex("widget_token_idx").on(t.token),
    orgIdx: uniqueIndex("widget_org_idx").on(t.organizationId),
  }),
);

// ============ GitHub Integration ============

export const githubIntegrations = pgTable(
  "github_integrations",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    repoOwner: varchar("repo_owner", { length: 255 }).notNull(),
    repoName: varchar("repo_name", { length: 255 }).notNull(),
    connectedByUserId: varchar("connected_by_user_id", { length: 36 }).notNull(),
    autoCreateIssues: boolean("auto_create_issues").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgUniqueIdx: uniqueIndex("github_integrations_org_unique_idx").on(t.organizationId),
  }),
);
