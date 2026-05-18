import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  type PgColumn,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { organization } from "./better-auth";

// ============ Enums ============

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_comment",
  "new_post",
  "post_merged",
  "status_changed",
  "mention",
  "vote_milestone",
  "autopilot_duplicate",
]);

export const boardVisibilityEnum = pgEnum("board_visibility", ["public", "private"]);
export const autopilotSuggestionTypeEnum = pgEnum("autopilot_suggestion_type", [
  "duplicate",
  "spam",
]);
export const autopilotSuggestionStatusEnum = pgEnum("autopilot_suggestion_status", [
  "pending",
  "approved",
  "dismissed",
  "auto_actioned",
]);
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

// ============ Subscription (Dodo Payments — managed here due to custom columns) ============

export const subscription = pgTable(
  "subscription",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    plan: varchar("plan", { length: 50 }).notNull(),
    referenceId: varchar("reference_id", { length: 255 }).notNull(),
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
    dodoCustomerId: varchar("dodo_customer_id", { length: 255 }),
    dodoSubscriptionId: varchar("dodo_subscription_id", { length: 255 }),
  },
  (t) => ({
    referenceIdIdx: index("subscription_reference_id_idx").on(t.referenceId),
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
    smartRepliesEnabled: boolean("smart_replies_enabled").notNull().default(false),
    smartRepliesInstructions: text("smart_replies_instructions"),
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
    // Cached total: own votes + all transitively merged posts' votes.
    // Updated atomically inside the merge/unmerge transaction so board listings
    // can ORDER BY vote_count without a recursive CTE per row.
    categoryId: varchar("category_id", { length: 128 }).references(
      (): PgColumn => feedbackCategories.id,
      { onDelete: "set null" },
    ),
    voteCount: integer("vote_count").notNull().default(0),
    // Null = active (top-level) post. Non-null = this post was merged into the referenced post.
    // ON DELETE SET NULL: if the surviving post is hard-deleted, merged posts become top-level again.
    mergedIntoPostId: varchar("merged_into_post_id", { length: 128 }).references(
      (): PgColumn => feedbackPosts.id,
      { onDelete: "set null" },
    ),
    mergedAt: timestamp("merged_at"),
    mergedByUserId: varchar("merged_by_user_id", { length: 36 }),
    aiSummary: text("ai_summary"),
    aiSummaryGeneratedAt: timestamp("ai_summary_generated_at"),
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
    // Primary board-view query filters on all three — covers org scope + board filter + status filter
    orgBoardStatusIdx: index("fp_org_board_status_idx").on(t.organizationId, t.boardId, t.status),
    // Lets us efficiently find all posts merged into a given post (for vote/comment aggregation)
    mergedIntoIdx: index("fp_merged_into_idx").on(t.mergedIntoPostId),
    voteCountNonNegative: check("fp_vote_count_non_negative", sql`vote_count >= 0`),
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
    isAiGenerated: boolean("is_ai_generated").notNull().default(false),
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
    // Chronological listing within a post; covers both the filter and the ORDER BY
    postCreatedAtIdx: index("comments_post_created_at_idx").on(t.postId, t.createdAt),
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
    orgStatusIdx: index("cd_org_status_idx").on(t.organizationId, t.status),
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

// ============ Webhook Endpoints ============

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }),
    url: varchar("url", { length: 2048 }).notNull(),
    secret: varchar("secret", { length: 64 }).notNull(),
    // JSON array of event names, e.g. ["feedback.created","changelog.published"] or ["*"] for all
    events: text("events").notNull().default('["*"]'),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("webhook_endpoints_org_id_idx").on(t.organizationId),
  }),
);

// ============ Integrations (generic: GitHub Issues, Linear, future providers) ============

export const integrations = pgTable(
  "integrations",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Provider identifier: "github", "linear", etc.
    provider: varchar("provider", { length: 50 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    // Audit only — who ran the OAuth connect flow. Token belongs to the org, not this user.
    connectedByUserId: varchar("connected_by_user_id", { length: 36 }),
    // Provider-specific config as JSON (e.g. repoOwner/repoName for GitHub, defaultTeamId for Linear)
    settings: text("settings"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgProviderUniqueIdx: uniqueIndex("integrations_org_provider_unique_idx").on(
      t.organizationId,
      t.provider,
    ),
    orgIdIdx: index("integrations_org_id_idx").on(t.organizationId),
  }),
);

// ============ Post External Links (generic: GitHub Issues, Linear, Jira, future providers) ============

export const postExternalLinks = pgTable(
  "post_external_links",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 })
      .notNull()
      .references(() => feedbackPosts.id, { onDelete: "cascade" }),
    // Denormalized for fast org-scoped queries without joining feedback_posts
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    externalUrl: varchar("external_url", { length: 2048 }),
    // Human-readable identifier shown in UI, e.g. "ENG-123" or "#42"
    identifier: varchar("identifier", { length: 100 }),
    // Cached from provider — may be stale, refreshed on demand
    externalTitle: text("external_title"),
    externalStatus: varchar("external_status", { length: 100 }),
    linkedByUserId: varchar("linked_by_user_id", { length: 36 }),
    // Provider-specific extras that don't fit standard columns (e.g. GitHub issueNumber integer, Jira projectKey)
    metadata: text("metadata"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    postProviderUniqueIdx: uniqueIndex("pel_post_provider_unique_idx").on(t.postId, t.provider),
    postIdIdx: index("pel_post_id_idx").on(t.postId),
    orgIdIdx: index("pel_org_id_idx").on(t.organizationId),
    // Webhook handlers query all links for a given provider across an org
    orgProviderIdx: index("pel_org_provider_idx").on(t.organizationId, t.provider),
  }),
);

// ============ Feedback Categories (user-visible, selectable on post creation) ============

export const feedbackCategories = pgTable(
  "feedback_categories",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("fc_org_id_idx").on(t.organizationId),
    orgNameUniqueIdx: uniqueIndex("fc_org_name_unique_idx").on(t.organizationId, t.name),
  }),
);

// ============ Feedback Tags (admin-only, applied post-creation) ============

export const feedbackTags = pgTable(
  "feedback_tags",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("ft_org_id_idx").on(t.organizationId),
    orgNameUniqueIdx: uniqueIndex("ft_org_name_unique_idx").on(t.organizationId, t.name),
  }),
);

// ============ Feedback Views (saved filter combinations) ============

export const feedbackViews = pgTable(
  "feedback_views",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    emoji: varchar("emoji", { length: 10 }).notNull().default("📌"),
    isSystem: boolean("is_system").notNull().default(false),
    sort: varchar("sort", { length: 20 }).notNull().default("newest"),
    order: integer("order").notNull().default(0),
    // JSON string of ViewFilters
    filters: text("filters").notNull().default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("fv_org_id_idx").on(t.organizationId),
    orgOrderIdx: index("fv_org_order_idx").on(t.organizationId, t.order),
  }),
);

// ============ User Profiles (end-user trait store for segmentation) ============

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }),
    externalId: varchar("external_id", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    plan: varchar("plan", { length: 100 }),
    role: varchar("role", { length: 100 }),
    companySize: integer("company_size"),
    industry: varchar("industry", { length: 100 }),
    location: varchar("location", { length: 100 }),
    customAttributes: text("custom_attributes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("up_org_id_idx").on(t.organizationId),
    orgEmailUniqueIdx: uniqueIndex("up_org_email_unique_idx").on(t.organizationId, t.email),
    orgExternalIdIdx: index("up_org_external_id_idx").on(t.organizationId, t.externalId),
  }),
);

// ============ Segments (saved voter filter presets) ============

export const segments = pgTable(
  "segments",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
    filters: text("filters").notNull().default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("seg_org_id_idx").on(t.organizationId),
    orgNameUniqueIdx: uniqueIndex("seg_org_name_unique_idx").on(t.organizationId, t.name),
  }),
);

// ============ Post Tags (junction) ============

export const postTags = pgTable(
  "post_tags",
  {
    postId: varchar("post_id", { length: 128 })
      .notNull()
      .references(() => feedbackPosts.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id", { length: 128 })
      .notNull()
      .references(() => feedbackTags.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    addedByUserId: varchar("added_by_user_id", { length: 36 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
    postIdIdx: index("post_tags_post_id_idx").on(t.postId),
    tagIdIdx: index("post_tags_tag_id_idx").on(t.tagId),
  }),
);

// ============ Autopilot Suggestions ============

export const autopilotSuggestions = pgTable(
  "autopilot_suggestions",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    type: autopilotSuggestionTypeEnum("type").notNull(),
    status: autopilotSuggestionStatusEnum("status").notNull().default("pending"),
    // The newly created post that triggered the suggestion
    sourcePostId: varchar("source_post_id", { length: 128 })
      .notNull()
      .references(() => feedbackPosts.id, { onDelete: "cascade" }),
    // For duplicate suggestions: the existing post to merge into
    targetPostId: varchar("target_post_id", { length: 128 }).references(() => feedbackPosts.id, {
      onDelete: "cascade",
    }),
    confidence: varchar("confidence", { length: 20 }).notNull(), // "low" | "medium" | "high"
    reason: text("reason"),
    resolvedAt: timestamp("resolved_at"),
    resolvedByUserId: varchar("resolved_by_user_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("ap_org_id_idx").on(t.organizationId),
    orgStatusIdx: index("ap_org_status_idx").on(t.organizationId, t.status),
    sourcePostIdx: index("ap_source_post_idx").on(t.sourcePostId),
  }),
);

// ============ Notifications ============

export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    type: notificationTypeEnum("type").notNull(),
    postId: varchar("post_id", { length: 128 }),
    actorId: varchar("actor_id", { length: 36 }),
    // JSON: { postTitle, commentBody, oldStatus, newStatus, voteCount, actorName }
    metadata: text("metadata"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("notif_user_id_idx").on(t.userId),
    orgUserIdx: index("notif_org_user_idx").on(t.organizationId, t.userId),
    postIdIdx: index("notif_post_id_idx").on(t.postId),
    orgUserCreatedIdx: index("notif_org_user_created_idx").on(
      t.organizationId,
      t.userId,
      t.createdAt,
    ),
    // "Unread notifications for user" is the hottest read on this table
    userUnreadIdx: index("notif_user_unread_idx").on(t.userId, t.readAt),
  }),
);
