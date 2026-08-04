CREATE UNIQUE INDEX IF NOT EXISTS "application_user_id_url_uidx" ON "application" ("user_id","url") WHERE "url" is not null;
