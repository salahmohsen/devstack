DO $$ BEGIN
  CREATE TYPE "application_tracking_status" AS ENUM('inbox', 'tracked', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "application_activity_kind" AS ENUM(
    'discovered',
    'promoted',
    'dismissed',
    'restored',
    'note',
    'stage_changed',
    'outcome_set',
    'package_generated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "source_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "agent_take" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "source_message_id" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "tracking_status" "application_tracking_status" DEFAULT 'tracked'::"application_tracking_status" NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "application"
    ADD CONSTRAINT "application_source_message_id_mail_message_id_fk"
    FOREIGN KEY ("source_message_id") REFERENCES "public"."mail_message"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_user_id_tracking_status_idx" ON "application" USING btree ("user_id","tracking_status");--> statement-breakpoint
-- Backfill source_tags from legacy single source when empty
UPDATE "application"
SET "source_tags" = ARRAY["source"::text]
WHERE "source" IS NOT NULL
  AND ("source_tags" IS NULL OR cardinality("source_tags") = 0);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_activity" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "application_id" text NOT NULL,
  "kind" "application_activity_kind" NOT NULL,
  "body" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "actor_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "application_activity"
    ADD CONSTRAINT "application_activity_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "application_activity"
    ADD CONSTRAINT "application_activity_application_id_application_id_fk"
    FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "application_activity"
    ADD CONSTRAINT "application_activity_actor_user_id_user_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_activity_application_id_created_at_idx" ON "application_activity" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_activity_user_id_application_id_idx" ON "application_activity" USING btree ("user_id","application_id");
