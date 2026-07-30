/**
 * Minimal Better Auth instance for Mastra server auth (session verify only).
 *
 * Why not `@tsu-stack/auth`? Mastra's bundler cannot analyze the full app auth
 * graph (email, OAuth, passkey, TanStack). Session verification only needs the
 * same `BETTER_AUTH_SECRET` + app session tables (DATABASE_URL).
 *
 * @see https://mastra.ai/docs/server/auth/better-auth
 */
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";

import { db } from "@tsu-stack/db";
import * as schema from "@tsu-stack/db/schema";

function nonEmptyEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

const secret = nonEmptyEnv("BETTER_AUTH_SECRET");
if (!secret && process.env.NODE_ENV === "production") {
  console.debug("[agent] BETTER_AUTH_SECRET unset — MastraAuthBetterAuth cannot verify sessions.");
}

const baseURL =
  nonEmptyEnv("VITE_SERVER_URL") ?? nonEmptyEnv("VITE_WEB_URL") ?? "http://localhost:5200";

/**
 * Shared-secret session store with the API. Do not enable social/email plugins
 * here — this instance only powers `auth.api.getSession` for agent HTTP.
 */
export const agentSessionAuth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  secret: secret ?? "dev-only-missing-better-auth-secret-min-32-chars!!",
  baseURL,
  // No emailAndPassword / social — verification-only; signing in happens on the API.
  telemetry: {
    enabled: false
  }
});
