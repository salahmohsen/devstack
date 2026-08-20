ALTER TABLE "stack" ADD COLUMN "alternative_names" jsonb DEFAULT '[]'::jsonb NOT NULL;
