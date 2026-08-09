import process from "node:process";

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const ENV_WEB_SERVER = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: {
    ...process.env,
    SOURCE_COMMIT:
      process.env.SOURCE_COMMIT ??
      process.env.DOKPLOY_COMMIT_HASH ??
      process.env.DOKPLOY_COMMIT_SHORT ??
      "unknown"
  },
  server: {
    // Vitest sets NODE_ENV=test when loading apps/web vite.config via `vp test`.
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SOURCE_COMMIT: z.string().min(1).default("unknown"),
    IS_BUILD: z.stringbool().default(false),
    FILES_API_SECRET: z.string().min(1).default("dev-only-secret-do-not-use-in-production"),
    // S3/MinIO Storage
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_BUCKET: z.string().default("personal-hub"),
    S3_REGION: z.string().default("us-east-1"),
    S3_FORCE_PATH_STYLE: z.stringbool().default(true),
    MEDIA_PUBLIC_URL: z.string().optional(),
    AGENT_WORKER_URL: z.string().optional()
  }
});
