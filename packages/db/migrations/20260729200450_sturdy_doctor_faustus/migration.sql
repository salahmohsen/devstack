CREATE TABLE "mail_crm_apply" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"message_id" text NOT NULL,
	"application_id" text,
	"effect_kind" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "mail_crm_apply_user_id_idx" ON "mail_crm_apply" ("user_id");--> statement-breakpoint
CREATE INDEX "mail_crm_apply_message_id_idx" ON "mail_crm_apply" ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_crm_apply_message_active_uidx" ON "mail_crm_apply" ("message_id") WHERE "undone_at" is null;--> statement-breakpoint
ALTER TABLE "mail_crm_apply" ADD CONSTRAINT "mail_crm_apply_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mail_crm_apply" ADD CONSTRAINT "mail_crm_apply_message_id_mail_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_message"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mail_crm_apply" ADD CONSTRAINT "mail_crm_apply_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE SET NULL;