CREATE TABLE "ai_correction" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"message_id" text,
	"from_name" text DEFAULT '' NOT NULL,
	"from_email" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"preview" text DEFAULT '' NOT NULL,
	"predicted_system_labels" text[] DEFAULT '{}'::text[] NOT NULL,
	"corrected_system_labels" text[] DEFAULT '{}'::text[] NOT NULL,
	"predicted_stage" text,
	"corrected_stage" text,
	"crm_apply_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_correction_user_id_idx" ON "ai_correction" ("user_id");--> statement-breakpoint
CREATE INDEX "ai_correction_user_id_created_at_idx" ON "ai_correction" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_correction_message_id_idx" ON "ai_correction" ("message_id");--> statement-breakpoint
ALTER TABLE "ai_correction" ADD CONSTRAINT "ai_correction_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_correction" ADD CONSTRAINT "ai_correction_message_id_mail_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_message"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_correction" ADD CONSTRAINT "ai_correction_crm_apply_id_mail_crm_apply_id_fkey" FOREIGN KEY ("crm_apply_id") REFERENCES "mail_crm_apply"("id") ON DELETE SET NULL;