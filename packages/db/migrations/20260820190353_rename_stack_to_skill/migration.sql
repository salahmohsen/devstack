ALTER TABLE "stack" RENAME TO "skill";--> statement-breakpoint
ALTER INDEX "stack_user_id_name_unique_idx" RENAME TO "skill_user_id_name_unique_idx";--> statement-breakpoint
ALTER INDEX "stack_user_id_sort_order_idx" RENAME TO "skill_user_id_sort_order_idx";--> statement-breakpoint
ALTER INDEX "stack_portfolio_entry_id_idx" RENAME TO "skill_portfolio_entry_id_idx";