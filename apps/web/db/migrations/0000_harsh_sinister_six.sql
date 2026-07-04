CREATE TYPE "public"."audit_action" AS ENUM('api_key_created', 'api_key_deleted', 'sso_configured', 'sso_deleted', 'member_invited', 'invitation_cancelled', 'member_removed', 'widget_secret_rotated', 'widget_token_regenerated');--> statement-breakpoint
CREATE TYPE "public"."autopilot_suggestion_status" AS ENUM('pending', 'approved', 'dismissed', 'auto_actioned');--> statement-breakpoint
CREATE TYPE "public"."autopilot_suggestion_type" AS ENUM('duplicate', 'spam');--> statement-breakpoint
CREATE TYPE "public"."board_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."changelog_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."domain_status" AS ENUM('pending', 'active', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('new_comment', 'new_post', 'post_merged', 'status_changed', 'mention', 'vote_milestone', 'autopilot_duplicate', 'owner_assigned');--> statement-breakpoint
CREATE TYPE "public"."post_activity_type" AS ENUM('status_changed', 'owner_assigned', 'merged', 'merged_into', 'unmerged', 'unmerged_from');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('open', 'reviewing', 'planned', 'in-progress', 'completed', 'closed');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('heart', 'thumbsup', 'thumbsdown', 'laugh', 'wow', 'sad');--> statement-breakpoint
CREATE TYPE "public"."widget_position" AS ENUM('left', 'right');--> statement-breakpoint
CREATE TYPE "public"."widget_theme" AS ENUM('light', 'dark', 'auto');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"reference_id" text NOT NULL,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_access_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"reference_id" text,
	"refresh_id" text,
	"expires_at" timestamp,
	"created_at" timestamp,
	"scopes" text NOT NULL,
	CONSTRAINT "oauth_access_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "oauth_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"disabled" boolean DEFAULT false,
	"skip_consent" boolean,
	"enable_end_session" boolean,
	"subject_type" text,
	"scopes" text,
	"user_id" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" text,
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" text NOT NULL,
	"post_logout_redirect_uris" text,
	"token_endpoint_auth_method" text,
	"grant_types" text,
	"response_types" text,
	"public" boolean,
	"type" text,
	"require_pkce" boolean,
	"reference_id" text,
	"metadata" text,
	CONSTRAINT "oauth_client_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"reference_id" text,
	"scopes" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "oauth_refresh_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"reference_id" text,
	"expires_at" timestamp,
	"created_at" timestamp,
	"revoked" timestamp,
	"auth_time" timestamp,
	"scopes" text NOT NULL,
	CONSTRAINT "oauth_refresh_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_role" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"organization_id" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sso_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"oidc_config" text,
	"saml_config" text,
	"user_id" text,
	"provider_id" text NOT NULL,
	"organization_id" text,
	"domain" text NOT NULL,
	CONSTRAINT "sso_provider_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"dodo_customer_id" text,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"actor_id" varchar(36),
	"actor_email" varchar(255) NOT NULL,
	"actor_name" varchar(255),
	"action" "audit_action" NOT NULL,
	"target_type" varchar(64),
	"target_id" varchar(128),
	"metadata" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autopilot_suggestions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"type" "autopilot_suggestion_type" NOT NULL,
	"status" "autopilot_suggestion_status" DEFAULT 'pending' NOT NULL,
	"source_post_id" varchar(128) NOT NULL,
	"target_post_id" varchar(128),
	"confidence" "confidence_level" NOT NULL,
	"reason" text,
	"resolved_at" timestamp,
	"resolved_by_user_id" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_likes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"changelog_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_subscribers" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"email" varchar(255) NOT NULL,
	"unsubscribe_token" varchar(128) NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "changelog_tags" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelogs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500),
	"body" text DEFAULT '[]' NOT NULL,
	"status" "changelog_status" DEFAULT 'draft' NOT NULL,
	"created_by" varchar(36),
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"parent_id" varchar(128),
	"commenter_profile_id" varchar(128),
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"import_source" varchar(50),
	"external_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commenter_actor_check" CHECK (user_id IS NOT NULL OR commenter_profile_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"monthly_spend" integer,
	"plan" varchar(100),
	"custom_attributes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_members" (
	"company_id" varchar(128) NOT NULL,
	"user_profile_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_members_company_id_user_profile_id_pk" PRIMARY KEY("company_id","user_profile_id")
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"domain" varchar(253) NOT NULL,
	"status" "domain_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dodo_webhook_events" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"subscription_id" varchar(255) NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"billing_date" varchar(10) DEFAULT '1970-01-01' NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_boards" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"visibility" "board_visibility" DEFAULT 'public' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"smart_replies_enabled" boolean DEFAULT false NOT NULL,
	"smart_replies_instructions" text,
	"anonymize_users" boolean DEFAULT false NOT NULL,
	"embed_token" varchar(128) DEFAULT replace(gen_random_uuid()::text, '-', '') NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_categories" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_posts" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"board_id" varchar(128) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" "post_status" DEFAULT 'open' NOT NULL,
	"created_by" varchar(36),
	"is_public_submission" boolean DEFAULT false NOT NULL,
	"submitter_email" varchar(255),
	"submitter_name" varchar(255),
	"category_id" varchar(128),
	"vote_count" integer DEFAULT 0 NOT NULL,
	"merged_into_post_id" varchar(128),
	"merged_at" timestamp,
	"merged_by_user_id" varchar(36),
	"owner_id" varchar(36),
	"rank" real,
	"ai_summary" text,
	"ai_summary_generated_at" timestamp,
	"import_source" varchar(50),
	"external_id" varchar(255),
	"original_created_at" timestamp,
	"import_job_id" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED,
	CONSTRAINT "fp_vote_count_non_negative" CHECK (vote_count >= 0)
);
--> statement-breakpoint
CREATE TABLE "feedback_tags" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_views" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"emoji" varchar(10) DEFAULT '📌' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort" varchar(20) DEFAULT 'newest' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"filters" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"source" varchar(50) NOT NULL,
	"status" "import_job_status" DEFAULT 'pending' NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"imported_records" integer DEFAULT 0 NOT NULL,
	"failed_records" integer DEFAULT 0 NOT NULL,
	"error_log" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"connected_by_user_id" varchar(36),
	"settings" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" "notification_type" NOT NULL,
	"post_id" varchar(128),
	"actor_id" varchar(36),
	"metadata" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"monthly_price" integer DEFAULT 0 NOT NULL,
	"interval" varchar(20) DEFAULT 'monthly' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_events" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"resource_id" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_activities" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"type" "post_activity_type" DEFAULT 'status_changed' NOT NULL,
	"old_value" varchar(100),
	"new_value" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_external_links" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"external_url" varchar(2048),
	"identifier" varchar(100),
	"external_title" text,
	"external_status" varchar(100),
	"linked_by_user_id" varchar(36),
	"metadata" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" varchar(128) NOT NULL,
	"tag_id" varchar(128) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by_user_id" varchar(36),
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"type" "reaction_type" DEFAULT 'heart' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"filters" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"plan" varchar(50) NOT NULL,
	"reference_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'incomplete' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancel_at" timestamp,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"seats" integer,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"billing_interval" varchar(20),
	"dodo_customer_id" varchar(255),
	"dodo_subscription_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"external_id" varchar(255),
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"plan" varchar(100),
	"role" varchar(100),
	"company_size" integer,
	"mrr" integer,
	"industry" varchar(100),
	"location" varchar(100),
	"custom_attributes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"user_id" varchar(36),
	"user_profile_id" varchar(128),
	"organization_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vote_actor_check" CHECK (user_id IS NOT NULL OR user_profile_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100),
	"url" varchar(2048) NOT NULL,
	"secret" varchar(64) NOT NULL,
	"events" text DEFAULT '["*"]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp,
	"last_delivery_status" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_configs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"token" varchar(128) NOT NULL,
	"signing_secret" varchar(64),
	"enabled" boolean DEFAULT true NOT NULL,
	"board_id" varchar(128),
	"position" "widget_position" DEFAULT 'right' NOT NULL,
	"theme" "widget_theme" DEFAULT 'auto' NOT NULL,
	"allowed_origins" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fk" FOREIGN KEY ("refresh_id") REFERENCES "public"."oauth_refresh_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_provider" ADD CONSTRAINT "sso_provider_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autopilot_suggestions" ADD CONSTRAINT "autopilot_suggestions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autopilot_suggestions" ADD CONSTRAINT "autopilot_suggestions_source_post_id_feedback_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autopilot_suggestions" ADD CONSTRAINT "autopilot_suggestions_target_post_id_feedback_posts_id_fk" FOREIGN KEY ("target_post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autopilot_suggestions" ADD CONSTRAINT "autopilot_suggestions_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_likes" ADD CONSTRAINT "changelog_likes_changelog_id_changelogs_id_fk" FOREIGN KEY ("changelog_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_likes" ADD CONSTRAINT "changelog_likes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_likes" ADD CONSTRAINT "changelog_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_subscribers" ADD CONSTRAINT "changelog_subscribers_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_tags" ADD CONSTRAINT "changelog_tags_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelogs" ADD CONSTRAINT "changelogs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelogs" ADD CONSTRAINT "changelogs_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_commenter_profile_id_user_profiles_id_fk" FOREIGN KEY ("commenter_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_boards" ADD CONSTRAINT "feedback_boards_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_boards" ADD CONSTRAINT "feedback_boards_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_categories" ADD CONSTRAINT "feedback_categories_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_board_id_feedback_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."feedback_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_category_id_feedback_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."feedback_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_merged_into_post_id_feedback_posts_id_fk" FOREIGN KEY ("merged_into_post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_merged_by_user_id_user_id_fk" FOREIGN KEY ("merged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_tags" ADD CONSTRAINT "feedback_tags_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_views" ADD CONSTRAINT "feedback_views_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_connected_by_user_id_user_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_events" ADD CONSTRAINT "portal_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_activities" ADD CONSTRAINT "post_activities_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_activities" ADD CONSTRAINT "post_activities_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_activities" ADD CONSTRAINT "post_activities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_external_links" ADD CONSTRAINT "post_external_links_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_external_links" ADD CONSTRAINT "post_external_links_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_external_links" ADD CONSTRAINT "post_external_links_linked_by_user_id_user_id_fk" FOREIGN KEY ("linked_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_feedback_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."feedback_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_added_by_user_id_user_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_configs" ADD CONSTRAINT "widget_configs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_configs" ADD CONSTRAINT "widget_configs_board_id_feedback_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."feedback_boards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "apikey" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "apikey" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_unique_idx" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_access_token_token_uidx" ON "oauth_access_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "oauth_access_token_clientId_idx" ON "oauth_access_token" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_sessionId_idx" ON "oauth_access_token" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_userId_idx" ON "oauth_access_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_refreshId_idx" ON "oauth_access_token" USING btree ("refresh_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_client_clientId_uidx" ON "oauth_client" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_client_userId_idx" ON "oauth_client" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_client_referenceId_idx" ON "oauth_client" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_clientId_idx" ON "oauth_consent" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_userId_idx" ON "oauth_consent" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_refresh_token_token_uidx" ON "oauth_refresh_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_clientId_idx" ON "oauth_refresh_token" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_sessionId_idx" ON "oauth_refresh_token" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_userId_idx" ON "oauth_refresh_token" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "org_role_organizationId_idx" ON "organization_role" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_role_name_orgId_uidx" ON "organization_role" USING btree ("role","organization_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "al_org_id_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "al_org_created_at_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "al_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "ap_org_id_idx" ON "autopilot_suggestions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ap_org_status_idx" ON "autopilot_suggestions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "ap_source_post_idx" ON "autopilot_suggestions" USING btree ("source_post_id");--> statement-breakpoint
CREATE INDEX "ap_resolved_at_idx" ON "autopilot_suggestions" USING btree ("resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_likes_unique_idx" ON "changelog_likes" USING btree ("changelog_id","user_id");--> statement-breakpoint
CREATE INDEX "changelog_likes_changelog_id_idx" ON "changelog_likes" USING btree ("changelog_id");--> statement-breakpoint
CREATE INDEX "cls_org_id_idx" ON "changelog_subscribers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cls_org_email_unique_idx" ON "changelog_subscribers" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "cls_token_idx" ON "changelog_subscribers" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "changelog_tags_org_id_idx" ON "changelog_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_tags_org_name_unique_idx" ON "changelog_tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "changelogs_org_id_idx" ON "changelogs" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "changelogs_org_slug_unique_idx" ON "changelogs" USING btree ("organization_id","slug") WHERE slug IS NOT NULL;--> statement-breakpoint
CREATE INDEX "changelogs_org_status_idx" ON "changelogs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "comments_post_id_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_org_id_idx" ON "comments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "comments_parent_id_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_post_created_at_idx" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_org_created_at_idx" ON "comments" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_commenter_profile_id_idx" ON "comments" USING btree ("commenter_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_import_dedup_idx" ON "comments" USING btree ("organization_id","import_source","external_id") WHERE import_source IS NOT NULL;--> statement-breakpoint
CREATE INDEX "company_org_id_idx" ON "companies" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_org_external_id_unique_idx" ON "companies" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE INDEX "company_org_spend_idx" ON "companies" USING btree ("organization_id","monthly_spend");--> statement-breakpoint
CREATE INDEX "company_org_plan_idx" ON "companies" USING btree ("organization_id","plan");--> statement-breakpoint
CREATE INDEX "company_member_profile_idx" ON "company_members" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "company_member_org_idx" ON "company_members" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domain_unique_idx" ON "custom_domains" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domain_org_unique_idx" ON "custom_domains" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cd_org_status_idx" ON "custom_domains" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "dwe_unique_event_idx" ON "dodo_webhook_events" USING btree ("event_type","subscription_id","product_id","billing_date");--> statement-breakpoint
CREATE INDEX "fb_org_id_idx" ON "feedback_boards" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_org_slug_unique_idx" ON "feedback_boards" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_embed_token_idx" ON "feedback_boards" USING btree ("embed_token");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_org_default_unique_idx" ON "feedback_boards" USING btree ("organization_id") WHERE is_default = true;--> statement-breakpoint
CREATE INDEX "fc_org_id_idx" ON "feedback_categories" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fc_org_name_unique_idx" ON "feedback_categories" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "fp_org_id_idx" ON "feedback_posts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fp_org_status_idx" ON "feedback_posts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "fp_board_id_idx" ON "feedback_posts" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "fp_board_status_idx" ON "feedback_posts" USING btree ("board_id","status");--> statement-breakpoint
CREATE INDEX "fp_org_board_status_idx" ON "feedback_posts" USING btree ("organization_id","board_id","status");--> statement-breakpoint
CREATE INDEX "fp_merged_into_idx" ON "feedback_posts" USING btree ("merged_into_post_id");--> statement-breakpoint
CREATE INDEX "fp_owner_id_idx" ON "feedback_posts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "fp_org_status_rank_idx" ON "feedback_posts" USING btree ("organization_id","status","rank");--> statement-breakpoint
CREATE INDEX "fp_board_votes_idx" ON "feedback_posts" USING btree ("board_id","vote_count");--> statement-breakpoint
CREATE INDEX "fp_active_board_idx" ON "feedback_posts" USING btree ("organization_id","board_id","created_at") WHERE merged_into_post_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "fp_import_dedup_idx" ON "feedback_posts" USING btree ("organization_id","import_source","external_id") WHERE import_source IS NOT NULL;--> statement-breakpoint
CREATE INDEX "fp_import_job_id_idx" ON "feedback_posts" USING btree ("import_job_id");--> statement-breakpoint
CREATE INDEX "fp_search_vector_gin_idx" ON "feedback_posts" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "ft_org_id_idx" ON "feedback_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ft_org_name_unique_idx" ON "feedback_tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "fv_org_id_idx" ON "feedback_views" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fv_org_order_idx" ON "feedback_views" USING btree ("organization_id","order");--> statement-breakpoint
CREATE INDEX "ij_org_id_idx" ON "import_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ij_org_status_idx" ON "import_jobs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "ij_org_created_at_idx" ON "import_jobs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_org_provider_unique_idx" ON "integrations" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "integrations_org_id_idx" ON "integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notif_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notif_org_user_idx" ON "notifications" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "notif_post_id_idx" ON "notifications" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "notif_org_user_created_idx" ON "notifications" USING btree ("organization_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "notif_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notif_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "plan_org_id_idx" ON "plans" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_org_name_unique_idx" ON "plans" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "pe_org_type_created_at_idx" ON "portal_events" USING btree ("organization_id","type","created_at");--> statement-breakpoint
CREATE INDEX "pe_org_resource_created_at_idx" ON "portal_events" USING btree ("organization_id","resource_id","created_at");--> statement-breakpoint
CREATE INDEX "pe_org_visitor_idx" ON "portal_events" USING btree ("organization_id","visitor_hash");--> statement-breakpoint
CREATE INDEX "pa_post_id_idx" ON "post_activities" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "pa_org_id_idx" ON "post_activities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pa_org_post_created_at_idx" ON "post_activities" USING btree ("organization_id","post_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pel_post_provider_unique_idx" ON "post_external_links" USING btree ("post_id","provider");--> statement-breakpoint
CREATE INDEX "pel_post_id_idx" ON "post_external_links" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "pel_org_id_idx" ON "post_external_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pel_org_provider_idx" ON "post_external_links" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "post_tags_post_id_idx" ON "post_tags" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_tags_tag_id_idx" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_reaction_idx" ON "reactions" USING btree ("post_id","user_id","type");--> statement-breakpoint
CREATE INDEX "reactions_post_id_idx" ON "reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "reactions_org_id_idx" ON "reactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "seg_org_id_idx" ON "segments" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seg_org_name_unique_idx" ON "segments" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_dodo_sub_idx" ON "subscription" USING btree ("dodo_subscription_id");--> statement-breakpoint
CREATE INDEX "up_org_id_idx" ON "user_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "up_org_email_unique_idx" ON "user_profiles" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "up_org_external_id_unique_idx" ON "user_profiles" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE INDEX "up_org_plan_idx" ON "user_profiles" USING btree ("organization_id","plan");--> statement-breakpoint
CREATE INDEX "up_org_role_idx" ON "user_profiles" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "up_org_industry_idx" ON "user_profiles" USING btree ("organization_id","industry");--> statement-breakpoint
CREATE INDEX "up_org_location_idx" ON "user_profiles" USING btree ("organization_id","location");--> statement-breakpoint
CREATE INDEX "up_org_company_size_idx" ON "user_profiles" USING btree ("organization_id","company_size");--> statement-breakpoint
CREATE INDEX "up_org_mrr_idx" ON "user_profiles" USING btree ("organization_id","mrr");--> statement-breakpoint
CREATE UNIQUE INDEX "native_vote_unique_idx" ON "votes" USING btree ("post_id","user_id") WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_vote_unique_idx" ON "votes" USING btree ("post_id","user_profile_id") WHERE user_profile_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "votes_post_id_idx" ON "votes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "votes_org_id_idx" ON "votes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "votes_org_created_at_idx" ON "votes" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "votes_user_profile_id_idx" ON "votes" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_org_id_idx" ON "webhook_endpoints" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_token_idx" ON "widget_configs" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_org_idx" ON "widget_configs" USING btree ("organization_id");