CREATE TYPE "resume_author" AS ENUM('admin', 'agent');--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE 'phone' BEFORE 'location';--> statement-breakpoint
CREATE TABLE "resume" (
	"id" text PRIMARY KEY,
	"prompt" text,
	"author" "resume_author" NOT NULL,
	"filename" text NOT NULL,
	"r2_key" text NOT NULL,
	"default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
