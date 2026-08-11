ALTER TABLE "contact" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_user_id_sort_order_idx" ON "contact" USING btree ("user_id","sort_order");
