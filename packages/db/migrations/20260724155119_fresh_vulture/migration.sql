-- IF NOT EXISTS: safe when journal was rebased after history rewrite and the
-- column may already exist on long-lived volumes.
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "analysis" text;