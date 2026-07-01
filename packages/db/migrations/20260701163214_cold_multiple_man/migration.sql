CREATE TYPE "contact_type_enum" AS ENUM('website', 'email', 'location');--> statement-breakpoint
CREATE TABLE "contact" (
	"user_id" text,
	"type" "contact_type_enum",
	"value" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_pkey" PRIMARY KEY("user_id","type")
);
--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;