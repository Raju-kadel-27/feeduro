import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  type PgColumn,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const tsvectorCol = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
import { organization, user } from "./better-auth";

// ============ Enums ============

export const affiliateStatusEnum = pgEnum("affiliate_status", [
  "pending",
  "active",
  "suspended",
]);
export const affiliateConversionTypeEnum = pgEnum("affiliate_conversion_type", [
  "signup",
  "subscription",
]);
export const affiliateConversionStatusEnum = pgEnum("affiliate_conversion_status", [
  "pending",
  "approved",
  "paid",
  "rejected",
  "flagged",
]);
export const affiliatePayoutStatusEnum = pgEnum("affiliate_payout_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_comment",
  "new_post",
  "post_merged",
  "status_changed",
  "mention",
  "vote_milestone",
  "autopilot_duplicate",
  "owner_assigned",
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
export const reactionTypeEnum = pgEnum("reaction_type", [
  "heart",
  "thumbsup",
  "thumbsdown",
  "laugh",
  "wow",
  "sad",
]);
export const confidenceEnum = pgEnum("confidence_level", ["low", "medium", "high"]);
export const postActivityTypeEnum = pgEnum("post_activity_type", [
  "status_changed",
  "owner_assigned",
  "merged",
  "merged_into",
  "unmerged",
]);

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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    visibility: boardVisibilityEnum("visibility").notNull().default("public"),
    isDefault: boolean("is_default").notNull().default(false),
    smartRepliesEnabled: boolean("smart_replies_enabled").notNull().default(false),
    smartRepliesInstructions: text("smart_replies_instructions"),
    anonymizeUsers: boolean("anonymize_users").notNull().default(false),
    // Unique token for per-board inline embeds (data-fdy-embed / FeediyoBoard)
    embedToken: varchar("embed_token", { length: 128 })
      .notNull()
      .default(sql`replace(gen_random_uuid()::text, '-', '')`)
      .$defaultFn(() => createId()),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("fb_org_id_idx").on(t.organizationId),
    orgSlugUniqueIdx: uniqueIndex("fb_org_slug_unique_idx").on(t.organizationId, t.slug),
    embedTokenIdx: uniqueIndex("fb_embed_token_idx").on(t.embedToken),
    // Only one board per org may be the default
    orgDefaultUniqueIdx: uniqueIndex("fb_org_default_unique_idx")
      .on(t.organizationId)
      .where(sql`is_default = true`),
  }),
);

export const feedbackPosts = pgTable(
  "feedback_posts",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    boardId: varchar("board_id", { length: 128 })
      .notNull()
      .references(() => feedbackBoards.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: postStatusEnum("status").notNull().default("open"),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    isPublicSubmission: boolean("is_public_submission").notNull().default(false),
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
    mergedByUserId: varchar("merged_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    ownerId: varchar("owner_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    rank: real("rank"),
    aiSummary: text("ai_summary"),
    aiSummaryGeneratedAt: timestamp("ai_summary_generated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    searchVector: tsvectorCol("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))`,
      { mode: "stored" },
    ),
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
    ownerIdx: index("fp_owner_id_idx").on(t.ownerId),
    orgStatusRankIdx: index("fp_org_status_rank_idx").on(t.organizationId, t.status, t.rank),
    // Vote-sorted board view — ORDER BY vote_count DESC within a board
    boardVotesIdx: index("fp_board_votes_idx").on(t.boardId, t.voteCount),
    // Active-posts filter: every board listing excludes merged posts
    activeBoardIdx: index("fp_active_board_idx")
      .on(t.organizationId, t.boardId, t.createdAt)
      .where(sql`merged_into_post_id IS NULL`),
    voteCountNonNegative: check("fp_vote_count_non_negative", sql`vote_count >= 0`),
    searchVectorGinIdx: index("fp_search_vector_gin_idx").using("gin", t.searchVector),
  }),
);

export const votes = pgTable(
  "votes",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 })
      .notNull()
      .references(() => feedbackPosts.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueVote: uniqueIndex("unique_vote_idx").on(t.postId, t.userId),
    postIdIdx: index("votes_post_id_idx").on(t.postId),
    orgIdIdx: index("votes_org_id_idx").on(t.organizationId),
    orgCreatedAtIdx: index("votes_org_created_at_idx").on(t.organizationId, t.createdAt),
  }),
);

export const comments = pgTable(
  "comments",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 })
      .notNull()
      .references(() => feedbackPosts.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: varchar("parent_id", { length: 128 }).references(
      (): PgColumn => comments.id,
      { onDelete: "set null" },
    ),
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
    // Period-based analytics queries: filter by org + date range
    orgCreatedAtIdx: index("comments_org_created_at_idx").on(t.organizationId, t.createdAt),
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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    // Nullable: drafts have no slug; slug is assigned at publish time
    slug: varchar("slug", { length: 500 }),
    body: text("body").notNull().default("[]"),
    status: changelogStatusEnum("status").notNull().default("draft"),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("changelogs_org_id_idx").on(t.organizationId),
    // Partial: only enforce uniqueness when slug is assigned
    orgSlugUniqueIdx: uniqueIndex("changelogs_org_slug_unique_idx")
      .on(t.organizationId, t.slug)
      .where(sql`slug IS NOT NULL`),
    orgStatusIdx: index("changelogs_org_status_idx").on(t.organizationId, t.status),
  }),
);

export const changelogViews = pgTable(
  "changelog_views",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    changelogId: varchar("changelog_id", { length: 128 })
      .notNull()
      .references(() => changelogs.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Nullable: logged-in users can be tracked; anonymous visitors get null
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    // Hash of IP + User-Agent for unique visitor counting without storing PII
    visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    changelogIdIdx: index("clv_changelog_id_idx").on(t.changelogId),
    orgIdIdx: index("clv_org_id_idx").on(t.organizationId),
    // Unique visitor lookup per changelog
    changelogVisitorIdx: index("clv_changelog_visitor_idx").on(t.changelogId, t.visitorHash),
  }),
);

export const reactions = pgTable(
  "reactions",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 })
      .notNull()
      .references(() => feedbackPosts.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull().default("heart"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueReaction: uniqueIndex("unique_reaction_idx").on(t.postId, t.userId, t.type),
    postIdIdx: index("reactions_post_id_idx").on(t.postId),
    orgIdIdx: index("reactions_org_id_idx").on(t.organizationId),
  }),
);

export const boardViews = pgTable(
  "board_views",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Nullable: logged-in users can be tracked; anonymous visitors get null
    userId: varchar("user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    // Hash of IP + User-Agent for unique visitor counting without storing PII
    visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // Primary analytics query: filter by org + date range
    orgCreatedAtIdx: index("bv_org_created_at_idx").on(t.organizationId, t.createdAt),
    // Unique visitor lookup per org (for deduplication in COUNT DISTINCT)
    orgVisitorIdx: index("bv_org_visitor_idx").on(t.organizationId, t.visitorHash),
  }),
);

export const postActivities = pgTable(
  "post_activities",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: varchar("post_id", { length: 128 })
      .notNull()
      .references(() => feedbackPosts.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Nullable so audit rows survive user deletion
    userId: varchar("user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    type: postActivityTypeEnum("type").notNull().default("status_changed"),
    oldValue: varchar("old_value", { length: 100 }),
    newValue: varchar("new_value", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    postIdIdx: index("pa_post_id_idx").on(t.postId),
    orgIdIdx: index("pa_org_id_idx").on(t.organizationId),
    orgPostCreatedAtIdx: index("pa_org_post_created_at_idx").on(t.organizationId, t.postId, t.createdAt),
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
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("changelog_tags_org_id_idx").on(t.organizationId),
    orgNameUniqueIdx: uniqueIndex("changelog_tags_org_name_unique_idx").on(
      t.organizationId,
      t.name,
    ),
  }),
);

export const changelogSubscribers = pgTable(
  "changelog_subscribers",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    unsubscribeToken: varchar("unsubscribe_token", { length: 128 }).notNull(),
    subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at"),
  },
  (t) => ({
    orgIdIdx: index("cls_org_id_idx").on(t.organizationId),
    orgEmailUniqueIdx: uniqueIndex("cls_org_email_unique_idx").on(t.organizationId, t.email),
    tokenIdx: uniqueIndex("cls_token_idx").on(t.unsubscribeToken),
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
    boardId: varchar("board_id", { length: 128 }).references(() => feedbackBoards.id, {
      onDelete: "set null",
    }),
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
    connectedByUserId: varchar("connected_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    externalUrl: varchar("external_url", { length: 2048 }),
    // Human-readable identifier shown in UI, e.g. "ENG-123" or "#42"
    identifier: varchar("identifier", { length: 100 }),
    // Cached from provider — may be stale, refreshed on demand
    externalTitle: text("external_title"),
    externalStatus: varchar("external_status", { length: 100 }),
    linkedByUserId: varchar("linked_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    emoji: varchar("emoji", { length: 10 }).notNull().default("📌"),
    isSystem: boolean("is_system").notNull().default(false),
    sort: varchar("sort", { length: 20 }).notNull().default("newest"),
    order: integer("order").notNull().default(0),
    // JSON string of ViewFilters
    filters: text("filters").notNull().default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
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
    // Unique per org so widget identity lookups are unambiguous
    orgExternalIdUniqueIdx: uniqueIndex("up_org_external_id_unique_idx").on(
      t.organizationId,
      t.externalId,
    ),
    // Segmentation filter columns
    orgPlanIdx: index("up_org_plan_idx").on(t.organizationId, t.plan),
    orgRoleIdx: index("up_org_role_idx").on(t.organizationId, t.role),
    orgIndustryIdx: index("up_org_industry_idx").on(t.organizationId, t.industry),
    orgLocationIdx: index("up_org_location_idx").on(t.organizationId, t.location),
    orgCompanySizeIdx: index("up_org_company_size_idx").on(t.organizationId, t.companySize),
  }),
);

// ============ Segments (saved voter filter presets) ============

export const segments = pgTable(
  "segments",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
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
    addedByUserId: varchar("added_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
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
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
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
    confidence: confidenceEnum("confidence").notNull(),
    reason: text("reason"),
    resolvedAt: timestamp("resolved_at"),
    resolvedByUserId: varchar("resolved_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("ap_org_id_idx").on(t.organizationId),
    orgStatusIdx: index("ap_org_status_idx").on(t.organizationId, t.status),
    sourcePostIdx: index("ap_source_post_idx").on(t.sourcePostId),
    // Prune old resolved suggestions efficiently
    resolvedAtIdx: index("ap_resolved_at_idx").on(t.resolvedAt),
  }),
);

// ============ Notifications ============

export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    postId: varchar("post_id", { length: 128 }).references(() => feedbackPosts.id, {
      onDelete: "set null",
    }),
    // Nullable so notification survives actor deletion
    actorId: varchar("actor_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
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
    // Enables efficient time-based cleanup of old notifications
    createdAtIdx: index("notif_created_at_idx").on(t.createdAt),
  }),
);

// ============ Affiliate Marketing ============

export const affiliates = pgTable(
  "affiliates",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    // Short alphanumeric code embedded in referral URLs, e.g. feediyo.com/r/abc123
    code: varchar("code", { length: 20 }).notNull().unique(),
    status: affiliateStatusEnum("status").notNull().default("active"),
    // Commission % applied to the subscription amount (default 20%)
    commissionPercent: integer("commission_percent").notNull().default(20),
    // 0 = one-time first payment only; >0 = recurring for N months
    commissionDurationMonths: integer("commission_duration_months").notNull().default(12),
    totalClicks: integer("total_clicks").notNull().default(0),
    totalConversions: integer("total_conversions").notNull().default(0),
    totalEarningsCents: integer("total_earnings_cents").notNull().default(0),
    // Where to send payouts (PayPal email or bank info)
    payoutEmail: varchar("payout_email", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    userIdIdx: index("aff_user_id_idx").on(t.userId),
    codeIdx: uniqueIndex("aff_code_idx").on(t.code),
    statusIdx: index("aff_status_idx").on(t.status),
  }),
);

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    affiliateId: varchar("affiliate_id", { length: 128 })
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    // SHA-256 of IP+UserAgent — used for deduplication without storing PII
    visitorToken: varchar("visitor_token", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    referrer: varchar("referrer", { length: 2048 }),
    converted: boolean("converted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    affiliateIdIdx: index("aclk_affiliate_id_idx").on(t.affiliateId),
    createdAtIdx: index("aclk_created_at_idx").on(t.createdAt),
    // Covers the DB-level click dedup query: affiliate + visitor within a time window
    dedupIdx: index("aclk_dedup_idx").on(t.affiliateId, t.visitorToken, t.createdAt),
  }),
);

export const affiliatePayouts = pgTable(
  "affiliate_payouts",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    affiliateId: varchar("affiliate_id", { length: 128 })
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    status: affiliatePayoutStatusEnum("status").notNull().default("pending"),
    paymentMethod: varchar("payment_method", { length: 50 }),
    paymentDetails: text("payment_details"),
    notes: text("notes"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    affiliateIdIdx: index("apay_affiliate_id_idx").on(t.affiliateId),
    statusIdx: index("apay_status_idx").on(t.status),
  }),
);

export const affiliateConversions = pgTable(
  "affiliate_conversions",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    affiliateId: varchar("affiliate_id", { length: 128 })
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    clickId: varchar("click_id", { length: 128 }).references(() => affiliateClicks.id, {
      onDelete: "set null",
    }),
    referredUserId: text("referred_user_id").references(() => user.id, { onDelete: "set null" }),
    referredOrgId: text("referred_org_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    type: affiliateConversionTypeEnum("type").notNull(),
    status: affiliateConversionStatusEnum("status").notNull().default("pending"),
    // Raw subscription amount billed (cents); 0 for signup-only conversions
    amountCents: integer("amount_cents").notNull().default(0),
    // Calculated commission = amountCents × commissionPercent / 100
    commissionCents: integer("commission_cents").notNull().default(0),
    payoutId: varchar("payout_id", { length: 128 }).references(
      (): PgColumn => affiliatePayouts.id,
      { onDelete: "set null" },
    ),
    // Prevents double-crediting the same Dodo subscription event
    dodoSubscriptionId: varchar("dodo_subscription_id", { length: 255 }),
    // Fraud review fields — set when automated rules trigger
    flaggedForReview: boolean("flagged_for_review").notNull().default(false),
    // JSON array of triggered rule names, e.g. ["disposable_email","velocity_exceeded"]
    flagReasons: text("flag_reasons"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    affiliateIdIdx: index("aconv_affiliate_id_idx").on(t.affiliateId),
    referredUserIdx: index("aconv_referred_user_idx").on(t.referredUserId),
    typeStatusIdx: index("aconv_type_status_idx").on(t.type, t.status),
    // FIX: DB-level unique constraint on (affiliateId, referredUserId, type=signup)
    // so that concurrent onboarding requests can't both INSERT a signup conversion.
    // The service uses onConflictDoNothing — this index makes that atomic.
    signupUniqueIdx: uniqueIndex("aconv_signup_unique_idx")
      .on(t.affiliateId, t.referredUserId)
      .where(sql`type = 'signup'`),
    // Prevents double-crediting the same Dodo subscription webhook re-delivery.
    dodoSubUniqueIdx: uniqueIndex("aconv_dodo_sub_unique_idx")
      .on(t.dodoSubscriptionId)
      .where(sql`dodo_subscription_id IS NOT NULL`),
    // Admin queue: fast lookup of conversions awaiting fraud review
    flaggedIdx: index("aconv_flagged_idx")
      .on(t.flaggedForReview)
      .where(sql`flagged_for_review = true`),
  }),
);

// ============ Affiliate Relations ============

export const affiliatesRelations = relations(affiliates, ({ one, many }) => ({
  user: one(user, { fields: [affiliates.userId], references: [user.id] }),
  clicks: many(affiliateClicks),
  conversions: many(affiliateConversions),
  payouts: many(affiliatePayouts),
}));

export const affiliateClicksRelations = relations(affiliateClicks, ({ one }) => ({
  affiliate: one(affiliates, { fields: [affiliateClicks.affiliateId], references: [affiliates.id] }),
}));

export const affiliateConversionsRelations = relations(affiliateConversions, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateConversions.affiliateId],
    references: [affiliates.id],
  }),
  referredUser: one(user, {
    fields: [affiliateConversions.referredUserId],
    references: [user.id],
  }),
  payout: one(affiliatePayouts, {
    fields: [affiliateConversions.payoutId],
    references: [affiliatePayouts.id],
  }),
}));

export const affiliatePayoutsRelations = relations(affiliatePayouts, ({ one, many }) => ({
  affiliate: one(affiliates, {
    fields: [affiliatePayouts.affiliateId],
    references: [affiliates.id],
  }),
  conversions: many(affiliateConversions),
}));
