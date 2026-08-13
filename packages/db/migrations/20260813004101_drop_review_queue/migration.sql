-- Remove Career Review queue.
-- Choice: DROP mail_reply_autonomy (+ enum) — product surface removed; replies
-- are always human-confirmed in the mail composer (no Assist/Full auto-send).

-- 1) Rewrite notification deep links that pointed at Review → Career Inbox.
UPDATE "app_notification"
SET "href" = '/dashboard/mail/all'
WHERE "kind" = 'mail.reply.draft_ready'
   OR ("href" IS NOT NULL AND "href" LIKE '%/dashboard/review%');--> statement-breakpoint

-- 2) Drop notification FK + column (must precede review_item drop).
ALTER TABLE "app_notification" DROP CONSTRAINT IF EXISTS "app_notification_review_item_id_review_item_id_fkey";--> statement-breakpoint
ALTER TABLE "app_notification" DROP COLUMN IF EXISTS "review_item_id";--> statement-breakpoint

-- 3) Drop review_item table, indexes (cascade), and enums.
DROP TABLE IF EXISTS "review_item";--> statement-breakpoint
DROP TYPE IF EXISTS "review_item_status";--> statement-breakpoint
DROP TYPE IF EXISTS "review_item_kind";--> statement-breakpoint

-- 4) Drop unused mail reply autonomy column + enum from AI settings.
ALTER TABLE "user_ai_settings" DROP COLUMN IF EXISTS "mail_reply_autonomy";--> statement-breakpoint
DROP TYPE IF EXISTS "mail_reply_autonomy_enum";
