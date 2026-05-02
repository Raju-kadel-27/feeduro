CREATE TYPE "public"."board_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."changelog_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."domain_status" AS ENUM('pending', 'active', 'failed');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('open', 'reviewing', 'planned', 'in-progress', 'completed', 'closed');--> statement-breakpoint
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
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	"stripe_customer_id" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
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
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stripe_customer_id" text,
	"dodo_customer_id" text,
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
CREATE TABLE "changelog_tags" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelogs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) DEFAULT '' NOT NULL,
	"body" text DEFAULT '[]' NOT NULL,
	"status" "changelog_status" DEFAULT 'draft' NOT NULL,
	"created_by" varchar(36) DEFAULT '' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"parent_id" varchar(128),
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"domain" varchar(253) NOT NULL,
	"status" "domain_status" DEFAULT 'pending' NOT NULL,
	"verification_token" varchar(64) NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"created_by" varchar(36) DEFAULT '' NOT NULL,
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
	"created_by" varchar(36) NOT NULL,
	"submitter_email" varchar(255),
	"submitter_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_activities" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" varchar(50) DEFAULT 'status_changed' NOT NULL,
	"old_value" varchar(100),
	"new_value" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"type" varchar(50) DEFAULT 'heart' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"plan" varchar(50) NOT NULL,
	"reference_id" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
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
	"stripe_schedule_id" varchar(255),
	"dodo_customer_id" varchar(255),
	"dodo_subscription_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_provider" ADD CONSTRAINT "sso_provider_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_tags" ADD CONSTRAINT "changelog_tags_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_configs" ADD CONSTRAINT "widget_configs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "apikey" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "apikey" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "changelog_tags_org_id_idx" ON "changelog_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_tags_org_name_unique_idx" ON "changelog_tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "changelogs_org_id_idx" ON "changelogs" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "changelogs_org_slug_unique_idx" ON "changelogs" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "changelogs_org_status_idx" ON "changelogs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "comments_post_id_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_org_id_idx" ON "comments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "comments_parent_id_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domain_unique_idx" ON "custom_domains" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domain_org_unique_idx" ON "custom_domains" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fb_org_id_idx" ON "feedback_boards" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_org_slug_unique_idx" ON "feedback_boards" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "fp_org_id_idx" ON "feedback_posts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fp_org_status_idx" ON "feedback_posts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "fp_board_id_idx" ON "feedback_posts" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "fp_board_status_idx" ON "feedback_posts" USING btree ("board_id","status");--> statement-breakpoint
CREATE INDEX "pa_post_id_idx" ON "post_activities" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "pa_org_id_idx" ON "post_activities" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_reaction_idx" ON "reactions" USING btree ("post_id","user_id","type");--> statement-breakpoint
CREATE INDEX "reactions_post_id_idx" ON "reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "reactions_org_id_idx" ON "reactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_sub_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_dodo_sub_idx" ON "subscription" USING btree ("dodo_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_vote_idx" ON "votes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "votes_post_id_idx" ON "votes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "votes_org_id_idx" ON "votes" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_token_idx" ON "widget_configs" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_org_idx" ON "widget_configs" USING btree ("organization_id");