ALTER TABLE "plans" ADD COLUMN "annual_monthly_price" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "billing_interval" varchar(20);--> statement-breakpoint
CREATE INDEX "up_org_billing_interval_idx" ON "user_profiles" USING btree ("organization_id","billing_interval");