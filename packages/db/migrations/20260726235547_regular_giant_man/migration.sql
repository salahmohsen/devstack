CREATE TABLE "invite" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL,
	"created_by_user_id" text,
	"used_by_user_id" text,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_slug_alias" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "invite_code_unique_idx" ON "invite" ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_slug_alias_slug_unique_idx" ON "profile_slug_alias" ("slug");--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_created_by_user_id_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_used_by_user_id_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "profile_slug_alias" ADD CONSTRAINT "profile_slug_alias_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;