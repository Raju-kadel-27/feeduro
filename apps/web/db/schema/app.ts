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
import { organization, user } from "./better-auth";

const tsvectorCol = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ============ Enums ============

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
  "unmerged_from",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "api_key_created",
  "api_key_deleted",
  "sso_configured",
  "sso_deleted",
  "member_invited",
  "invitation_cancelled",
  "member_removed",
  "widget_secret_rotated",
  "widget_token_regenerated",
]);

export const importJobStatusEnum = pgEnum("import_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "rolled_back",
]);

// ============ Dodo Payments — processed webhook events (idempotency log) ============

export const dodoWebhookEvents = pgTable(
  "dodo_webhook_events",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    subscriptionId: varchar("subscription_id", { length: 255 }).notNull(),
    productId: varchar("product_id", { length: 255 }).notNull(),
    // YYYY-MM-DD string; "1970-01-01" sentinel for events with no next billing date (cancelled/expired)
    billingDate: varchar("billing_date", { length: 10 }).notNull().default("1970-01-01"),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("dwe_unique_event_idx").on(
      t.eventType,
      t.subscriptionId,
      t.productId,
      t.billingDate,
    ),
  ],
);

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
    // Unique token for per-board inline embeds (data-fdy-embed / FeeduroBoard)
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
    // Import provenance — null on all natively created posts
    importSource: varchar("import_source", { length: 50 }),
    externalId: varchar("external_id", { length: 255 }),
    // Preserves the original creation timestamp from the source platform
    originalCreatedAt: timestamp("original_created_at"),
    // Links to the import job that created this post. set null (not cascade) so accidentally
    // deleting a job record does not wipe posts. Rollback: DELETE WHERE import_job_id = $id.
    importJobId: varchar("import_job_id", { length: 128 }).references(
      (): PgColumn => importJobs.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    searchVector: tsvectorCol("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))`,
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
    // Idempotent re-imports: a (org, platform, external post id) triple must be unique
    importDedupIdx: uniqueIndex("fp_import_dedup_idx")
      .on(t.organizationId, t.importSource, t.externalId)
      .where(sql`import_source IS NOT NULL`),
    // Rollback lookup: DELETE WHERE import_job_id = $id must be fast on large tables
    importJobIdIdx: index("fp_import_job_id_idx").on(t.importJobId),
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
    // Null for imported votes attributed to a userProfile rather than an auth user
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "cascade" }),
    // Populated for imported votes (Canny/Productboard/CSV) and optionally for widget votes.
    // cascade: deleting a userProfile removes their imported votes, matching userId's behaviour.
    userProfileId: varchar("user_profile_id", { length: 128 }).references(
      (): PgColumn => userProfiles.id,
      { onDelete: "cascade" },
    ),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // Two partial unique indexes instead of one — each covers its own actor type
    nativeVoteUniqueIdx: uniqueIndex("native_vote_unique_idx")
      .on(t.postId, t.userId)
      .where(sql`user_id IS NOT NULL`),
    profileVoteUniqueIdx: uniqueIndex("profile_vote_unique_idx")
      .on(t.postId, t.userProfileId)
      .where(sql`user_profile_id IS NOT NULL`),
    // Every vote must be attributed to exactly one actor
    voteActorCheck: check(
      "vote_actor_check",
      sql`user_id IS NOT NULL OR user_profile_id IS NOT NULL`,
    ),
    postIdIdx: index("votes_post_id_idx").on(t.postId),
    orgIdIdx: index("votes_org_id_idx").on(t.organizationId),
    orgCreatedAtIdx: index("votes_org_created_at_idx").on(t.organizationId, t.createdAt),
    // "All posts voted on by customer X" — essential once import is live
    userProfileIdIdx: index("votes_user_profile_id_idx").on(t.userProfileId),
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
    // Null for imported comments attributed to a userProfile rather than an auth user
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "cascade" }),
    parentId: varchar("parent_id", { length: 128 }).references(
      (): PgColumn => comments.id,
      { onDelete: "set null" },
    ),
    // Populated for imported comments from external platforms; null for native comments
    commenterProfileId: varchar("commenter_profile_id", { length: 128 }).references(
      (): PgColumn => userProfiles.id,
      { onDelete: "set null" },
    ),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    isAiGenerated: boolean("is_ai_generated").notNull().default(false),
    // Import provenance — null on all natively created comments
    importSource: varchar("import_source", { length: 50 }),
    externalId: varchar("external_id", { length: 255 }),
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
    // Every comment must have an actor (mirrors the votes pattern)
    commenterActorCheck: check(
      "commenter_actor_check",
      sql`user_id IS NOT NULL OR commenter_profile_id IS NOT NULL`,
    ),
    // "All comments by customer X" — needed once import is live
    commenterProfileIdIdx: index("comments_commenter_profile_id_idx").on(t.commenterProfileId),
    // Idempotent re-imports: (org, platform, external comment id) must be unique
    commentImportDedupIdx: uniqueIndex("comment_import_dedup_idx")
      .on(t.organizationId, t.importSource, t.externalId)
      .where(sql`import_source IS NOT NULL`),
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

export const portalEvents = pgTable(
  "portal_events",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // sha256(ip + ua + orgId) — anonymous dedup without PII
    visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
    // board_view | roadmap_view | updates_view | changelog_view
    type: varchar("type", { length: 32 }).notNull(),
    // boardId for board_view, changelogId for changelog_view, null for roadmap/updates
    resourceId: varchar("resource_id", { length: 128 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // Primary filter: org + type + date range
    orgTypeCreatedAtIdx: index("pe_org_type_created_at_idx").on(t.organizationId, t.type, t.createdAt),
    // Per-resource traffic (per-board, per-changelog)
    orgResourceCreatedAtIdx: index("pe_org_resource_created_at_idx").on(t.organizationId, t.resourceId, t.createdAt),
    // Unique visitor dedup
    orgVisitorIdx: index("pe_org_visitor_idx").on(t.organizationId, t.visitorHash),
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

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // FK survives user deletion via SET NULL; actorEmail preserves identity permanently
    actorId: varchar("actor_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    actorEmail: varchar("actor_email", { length: 255 }).notNull(),
    actorName: varchar("actor_name", { length: 255 }),
    action: auditActionEnum("action").notNull(),
    // What resource was affected (e.g. "api_key", "sso_provider", "member", "widget")
    targetType: varchar("target_type", { length: 64 }),
    targetId: varchar("target_id", { length: 128 }),
    metadata: text("metadata"),
    // IPv4 max 15 chars, IPv6 max 45 chars
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("al_org_id_idx").on(t.organizationId),
    index("al_org_created_at_idx").on(t.organizationId, t.createdAt),
    index("al_actor_id_idx").on(t.actorId),
  ],
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

export const changelogLikes = pgTable(
  "changelog_likes",
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
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueIdx: uniqueIndex("changelog_likes_unique_idx").on(t.changelogId, t.userId),
    changelogIdIdx: index("changelog_likes_changelog_id_idx").on(t.changelogId),
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
    lastDeliveryAt: timestamp("last_delivery_at"),
    lastDeliveryStatus: integer("last_delivery_status"),
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
    mrr: integer("mrr"),
    // 'monthly' | 'annual' — determines which plan price is used in MRR resolution.
    billingInterval: varchar("billing_interval", { length: 20 }),
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
    orgMrrIdx: index("up_org_mrr_idx").on(t.organizationId, t.mrr),
    orgBillingIntervalIdx: index("up_org_billing_interval_idx").on(t.organizationId, t.billingInterval),
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

// ============ Plan Catalog (pricing tiers for MRR resolution) ============

// One row per pricing tier an org offers to *their* customers. `name` matches
// userProfiles.plan within the org so a voter's MRR can be resolved from their plan.
// monthlyPrice is normalized monthly revenue in whole dollars (same unit as userProfiles.mrr).
export const plans = pgTable(
  "plans",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    monthlyPrice: integer("monthly_price").notNull().default(0),
    // Optional normalized annual price in $/mo (e.g. $960/yr → 80). When set, users with
    // billingInterval='annual' use this value instead of monthlyPrice for MRR resolution.
    annualMonthlyPrice: integer("annual_monthly_price"),
    // Kept for backward compat; no longer used in MRR math — annualMonthlyPrice is the source of truth.
    interval: varchar("interval", { length: 20 }).notNull().default("monthly"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("plan_org_id_idx").on(t.organizationId),
    orgNameUniqueIdx: uniqueIndex("plan_org_name_unique_idx").on(t.organizationId, t.name),
  }),
);

// ============ Companies (account-level MRR, Canny-style) ============

// One row per company an org sells to. Named "companies" (not "accounts") to avoid confusion with
// better-auth's oauth `account` table, and to match Canny's terminology. `monthlySpend` is the
// company's MRR in whole dollars; when null it falls back to the plan catalog price for `plan`.
export const companies = pgTable(
  "companies",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // The org's own identifier for this company (from identify()/CSV). Unique per org.
    externalId: varchar("external_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    monthlySpend: integer("monthly_spend"),
    plan: varchar("plan", { length: 100 }),
    customAttributes: text("custom_attributes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    orgIdIdx: index("company_org_id_idx").on(t.organizationId),
    orgExternalIdUniqueIdx: uniqueIndex("company_org_external_id_unique_idx").on(
      t.organizationId,
      t.externalId,
    ),
    orgSpendIdx: index("company_org_spend_idx").on(t.organizationId, t.monthlySpend),
    orgPlanIdx: index("company_org_plan_idx").on(t.organizationId, t.plan),
  }),
);

// Junction: a user profile belongs to one or more companies (Canny-style many-to-many).
export const companyMembers = pgTable(
  "company_members",
  {
    companyId: varchar("company_id", { length: 128 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userProfileId: varchar("user_profile_id", { length: 128 })
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.companyId, t.userProfileId] }),
    profileIdx: index("company_member_profile_idx").on(t.userProfileId),
    orgIdx: index("company_member_org_idx").on(t.organizationId),
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

// ============ Import Jobs ============

export const importJobs = pgTable(
  "import_jobs",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Platform being imported from: "canny" | "productboard" | "uservoice" | "csv"
    source: varchar("source", { length: 50 }).notNull(),
    status: importJobStatusEnum("status").notNull().default("pending"),
    totalRecords: integer("total_records").notNull().default(0),
    importedRecords: integer("imported_records").notNull().default(0),
    failedRecords: integer("failed_records").notNull().default(0),
    // JSON array of { row: number; reason: string } entries
    errorLog: text("error_log"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("ij_org_id_idx").on(t.organizationId),
    orgStatusIdx: index("ij_org_status_idx").on(t.organizationId, t.status),
    // Lets admin UIs show recent import history sorted by creation time
    orgCreatedAtIdx: index("ij_org_created_at_idx").on(t.organizationId, t.createdAt),
  }),
);
