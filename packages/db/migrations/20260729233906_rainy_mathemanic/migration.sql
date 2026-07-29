CREATE TABLE "mail_smart_rule" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'sparkles' NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mail_smart_rule_user_id_slug_uidx" ON "mail_smart_rule" ("user_id","slug");--> statement-breakpoint
CREATE INDEX "mail_smart_rule_user_id_idx" ON "mail_smart_rule" ("user_id");--> statement-breakpoint
ALTER TABLE "mail_smart_rule" ADD CONSTRAINT "mail_smart_rule_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;