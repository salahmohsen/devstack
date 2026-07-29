ALTER TABLE "ai_correction" ADD COLUMN "mastra_trace_id" text;--> statement-breakpoint
ALTER TABLE "ai_correction" ADD COLUMN "mastra_run_id" text;--> statement-breakpoint
ALTER TABLE "mail_message" ADD COLUMN "mastra_classify_run_id" text;--> statement-breakpoint
ALTER TABLE "mail_message" ADD COLUMN "mastra_classify_trace_id" text;