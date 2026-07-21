import { createEnv } from "@t3-oss/env-core";
import { isProduction } from "std-env";
import { z } from "zod";

import { normalizedUrlSchema } from "#@/utils/url";

console.debug("⏳ [ENV_WEB_ISOMORPHIC] Loading environment variables...", {
  VITE_SERVER_URL: import.meta.env ?? process.env.VITE_SERVER_URL,
  VITE_WEB_URL: import.meta.env ?? process.env.VITE_WEB_URL
});

export const ENV_WEB_ISOMORPHIC = createEnv({
  client: {
    VITE_IMGPROXY_URL: z.url().optional(),
    VITE_SERVER_URL: isProduction
      ? normalizedUrlSchema
      : normalizedUrlSchema.default("http://localhost:5001"),
    VITE_WEB_URL: isProduction
      ? normalizedUrlSchema
      : normalizedUrlSchema.default("http://localhost:3000")
  },
  server: {
    /**
     * Internal Docker-network URL of the Hono server. Used by the
     * web app's server-side oRPC client during SSR so it can call
     * the server over HTTP without going through the Cloudflare
     * tunnel. Falls back to VITE_SERVER_URL (the public URL) if
     * not set, which is fine in dev or when no internal URL exists.
     */
    VITE_SERVER_URL_INTERNAL: normalizedUrlSchema.optional()
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: import.meta.env ?? process.env
});

console.debug("✅ [ENV_WEB_ISOMORPHIC] Successfully loaded environment variables.");
