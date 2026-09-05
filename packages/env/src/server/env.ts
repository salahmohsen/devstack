import process from "node:process";

import { createEnv } from "@t3-oss/env-core";
import { isProduction } from "std-env";
import { z } from "zod";

const URL_WITH_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

function normalizeUrlString(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return trimmedValue;
  const protocol = isProduction ? "https://" : "http://";
  return URL_WITH_SCHEME_PATTERN.test(trimmedValue) ? trimmedValue : `${protocol}${trimmedValue}`;
}

const normalizedUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return normalizeUrlString(value);
}, z.url());

const IS_BUILD = process.env.IS_BUILD === "true";

// Required at runtime, but optional at build time so the build can run
// without runtime-only secrets (OAuth, etc.). At runtime a missing value
// is still a hard error. The build pipeline sets IS_BUILD=true via
// `cross-env` in apps/web/vite.config.ts and apps/server/package.json.
function runtimeRequired<T extends z.ZodTypeAny>(schema: T) {
  return IS_BUILD ? schema.optional() : schema;
}

export const ENV_SERVER = createEnv({
  skipValidation: true,

  emptyStringAsUndefined: true,
  runtimeEnv: {
    // Spread `process.env` first so explicit defaults below can backfill
    // any var that isn't set in the environment (e.g. dev-time defaults
    // for `VITE_*` URL vars). Putting the spread last would silently
    // overwrite these defaults.
    ...process.env,
    // Prefer SOURCE_COMMIT; accept Dokploy future inject + legacy Coolify alias.
    SOURCE_COMMIT:
      process.env.SOURCE_COMMIT ??
      process.env.DOKPLOY_COMMIT_HASH ??
      process.env.DOKPLOY_COMMIT_SHORT ??
      process.env.WORKERS_CI_COMMIT_SHA ??
      "unknown",
    VITE_SERVER_URL: process.env.VITE_SERVER_URL ?? "http://localhost:5200",
    VITE_WEB_URL: process.env.VITE_WEB_URL ?? "http://localhost:3000",
    // Tunnel public origin for inbound webhooks (optional; falls back to VITE_SERVER_URL).
    PUBLIC_SERVER_URL: process.env.PUBLIC_SERVER_URL ?? process.env.DEV_PUBLIC_SERVER_URL
  } as Record<string, string | undefined>,
  server: {
    VITE_SERVER_URL: isProduction
      ? normalizedUrlSchema
      : normalizedUrlSchema.default("http://localhost:5200"),
    VITE_WEB_URL: isProduction
      ? normalizedUrlSchema
      : normalizedUrlSchema.default("http://localhost:3000"),
    /**
     * Public HTTPS origin for inbound webhooks when the browser API stays on
     * localhost (local `pnpm dev:tunnel`). Prefer this for Resend/Gmail copy-paste
     * URLs; falls back to VITE_SERVER_URL when unset.
     */
    PUBLIC_SERVER_URL: normalizedUrlSchema.optional(),
    // DATABASE_URL is used at module load by the Drizzle singleton in
    // packages/db/src/index.ts (Better Auth's drizzle adapter initializes
    // once at import time), so the value must be present for the build
    // to import the package successfully.
    DATABASE_URL: z.string().min(1),
    // BETTER_AUTH_SECRET is used at module load by Better Auth's init in
    // packages/auth/src/auth.ts, so the value must be present for the build
    // to import the package successfully.
    BETTER_AUTH_SECRET: z.string().min(32),
    PORT: z.coerce.number().default(5100),
    // Vitest sets NODE_ENV=test when loading Vite configs under `vp test`.
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    /** Build / deploy SHA (Dokploy `SOURCE_COMMIT`, CI, or local default). */
    SOURCE_COMMIT: z.string().min(1).default("unknown"),
    ENABLE_OPEN_API_DOCS: z.stringbool().default(false),
    IS_BUILD: z.stringbool().default(false), // set to 'true' during build, can be used to conditionally disable features that should only run during runtime and not during build/prerendering
    GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: runtimeRequired(z.string().min(1)),
    GITHUB_CLIENT_SECRET: runtimeRequired(z.string().min(1)),
    /** Google OAuth (login + Gmail connect). Optional until Connections is used. */
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    // Optional Axiom sink for @tsu-stack/logger wide events (API key + dataset required to enable).
    AXIOM_API_KEY: z.string().optional(),
    AXIOM_DATASET: z.string().optional(),
    /** Edge ingest base, e.g. https://us-east-1.aws.edge.axiom.co (from Console ingest snippet). */
    AXIOM_EDGE_URL: z.url().optional(),

    // Agent Worker URL — used as a fallback in dev when no Cloudflare service
    // binding is available. In production, prefer the AGENT_WORKER service
    // binding (which `createAgentWorker` checks first).
    AGENT_WORKER_URL: z.url().optional(),
    /**
     * Gmail Pub/Sub push auth (see packages/api gmail verify helper).
     * OIDC audience is typically the full push endpoint URL.
     */
    GMAIL_PUSH_SHARED_SECRET: z.string().min(16).optional(),
    GMAIL_PUSH_OIDC_AUDIENCE: z.string().min(1).optional(),
    GMAIL_PUSH_OIDC_EMAIL: z.string().email().optional(),
    GMAIL_PUSH_REQUIRE_AUTH: z.stringbool().optional(),
    GMAIL_PUBSUB_TOPIC: z.string().min(1).optional(),
    // Redis
    REDIS_URL: z.string().optional(),
    /** Freehire API base override (fail-soft drills / staging). Defaults to https://freehire.me/api/v1. */
    FREEHIRE_API_BASE_URL: normalizedUrlSchema.optional()
  }
});
