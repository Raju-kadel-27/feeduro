ALTER TABLE "comments" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "pinned_at" timestamp;--> statement-breakpoint
CREATE INDEX "comments_post_pinned_idx" ON "comments" USING btree ("post_id","is_pinned");