DO $$ BEGIN
  CREATE TYPE "employment_type" AS ENUM('unknown', 'full_time', 'part_time', 'contract', 'internship');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "employment_type" "employment_type" DEFAULT 'unknown'::"employment_type" NOT NULL;
