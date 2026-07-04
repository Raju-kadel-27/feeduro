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
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_org_id_idx" ON "companies" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_org_external_id_unique_idx" ON "companies" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE INDEX "company_org_spend_idx" ON "companies" USING btree ("organization_id","monthly_spend");--> statement-breakpoint
CREATE INDEX "company_org_plan_idx" ON "companies" USING btree ("organization_id","plan");--> statement-breakpoint
CREATE INDEX "company_member_profile_idx" ON "company_members" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "company_member_org_idx" ON "company_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "plan_org_id_idx" ON "plans" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_org_name_unique_idx" ON "plans" USING btree ("organization_id","name");