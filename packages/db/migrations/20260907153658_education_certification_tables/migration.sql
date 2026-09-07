CREATE TABLE "certification" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	"issued_at" text,
	"expires_at" text,
	"credential_url" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"school" text NOT NULL,
	"degree" text NOT NULL,
	"field" text,
	"location" text,
	"from_date" text,
	"to_date" text,
	"is_present" boolean DEFAULT false,
	"description" text,
	"gpa" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "certification_user_id_sort_order_idx" ON "certification" ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "education_user_id_sort_order_idx" ON "education" ("user_id","sort_order");--> statement-breakpoint
ALTER TABLE "certification" ADD CONSTRAINT "certification_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
