CREATE TABLE "github_integrations" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"repo_owner" varchar(255) NOT NULL,
	"repo_name" varchar(255) NOT NULL,
	"connected_by_user_id" varchar(36) NOT NULL,
	"auto_create_issues" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD COLUMN "github_issue_number" integer;--> statement-breakpoint
ALTER TABLE "feedback_posts" ADD COLUMN "github_issue_url" varchar(500);--> statement-breakpoint
ALTER TABLE "github_integrations" ADD CONSTRAINT "github_integrations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_integrations_org_unique_idx" ON "github_integrations" USING btree ("organization_id");