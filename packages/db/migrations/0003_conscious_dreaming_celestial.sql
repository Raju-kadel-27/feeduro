CREATE TABLE "segments_setup" (
	"organization_id" varchar(36) PRIMARY KEY NOT NULL,
	"wizard_skipped" boolean DEFAULT false NOT NULL,
	"guide_dismissed" boolean DEFAULT false NOT NULL,
	"wizard_draft" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "segments_setup" ADD CONSTRAINT "segments_setup_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;