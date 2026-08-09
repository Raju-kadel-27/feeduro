CREATE TABLE "changelog_authors" (
	"changelog_id" varchar(128) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_authors_changelog_id_user_id_pk" PRIMARY KEY("changelog_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "changelog_requests" (
	"changelog_id" varchar(128) NOT NULL,
	"post_id" varchar(128) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_requests_changelog_id_post_id_pk" PRIMARY KEY("changelog_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "changelog_tag_items" (
	"changelog_id" varchar(128) NOT NULL,
	"tag_id" varchar(128) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_tag_items_changelog_id_tag_id_pk" PRIMARY KEY("changelog_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "changelog_authors" ADD CONSTRAINT "changelog_authors_changelog_id_changelogs_id_fk" FOREIGN KEY ("changelog_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_authors" ADD CONSTRAINT "changelog_authors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_authors" ADD CONSTRAINT "changelog_authors_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_requests" ADD CONSTRAINT "changelog_requests_changelog_id_changelogs_id_fk" FOREIGN KEY ("changelog_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_requests" ADD CONSTRAINT "changelog_requests_post_id_feedback_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_requests" ADD CONSTRAINT "changelog_requests_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_tag_items" ADD CONSTRAINT "changelog_tag_items_changelog_id_changelogs_id_fk" FOREIGN KEY ("changelog_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_tag_items" ADD CONSTRAINT "changelog_tag_items_tag_id_changelog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."changelog_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cauth_changelog_id_idx" ON "changelog_authors" USING btree ("changelog_id");--> statement-breakpoint
CREATE INDEX "cauth_org_id_idx" ON "changelog_authors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "creq_changelog_id_idx" ON "changelog_requests" USING btree ("changelog_id");--> statement-breakpoint
CREATE INDEX "creq_org_id_idx" ON "changelog_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cti_changelog_id_idx" ON "changelog_tag_items" USING btree ("changelog_id");--> statement-breakpoint
CREATE INDEX "cti_tag_id_idx" ON "changelog_tag_items" USING btree ("tag_id");