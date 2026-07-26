import { createEnv } from "@t3-oss/env-core";
import { isProduction } from "std-env";
import { z } from "zod";

import { normalizedUrlSchema } from "#@/utils/url";

/**
 * Node `process.env` without `import "node:process"`.
 * That bare import is externalized by Vite and throws in the browser
 * (`Cannot access "node:process.env" in client code`), which left
 * `/repos` stuck on the SSR shell "Loading" state.
 *
 * On SSR/Node the global is available so Docker runtime vars like
 * SERVER_URL_INTERNAL still merge in; in the browser this is empty and
 * `import.meta.env` supplies the `VITE_*` values.
 */
function getNodeProcessEnv(): Record<string, string | undefined> {
  if (typeof process === "undefined" || !process.env) {
    return {};
  }
  return process.env as Record<string, string | undefined>;
}

// Spread Node env first, then Vite `import.meta.env`, so build-time
// `VITE_*` win where both exist, while SSR still sees runtime-only keys.
const runtimeEnv = {
  ...getNodeProcessEnv(),
  ...(import.meta.env as Record<string, string | undefined>)
};

console.debug("⏳ [ENV_WEB_ISOMORPHIC] Loading environment variables...", {
  VITE_SERVER_URL: runtimeEnv.VITE_SERVER_URL,
  VITE_WEB_URL: runtimeEnv.VITE_WEB_URL,
  hasServerUrlInternal: Boolean(runtimeEnv.SERVER_URL_INTERNAL)
});

export const ENV_WEB_ISOMORPHIC = createEnv({
  client: {
    VITE_IMGPROXY_URL: z.url().optional(),
    VITE_SERVER_URL: isProduction
      ? normalizedUrlSchema
      : normalizedUrlSchema.default("http://localhost:5200"),
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
    SERVER_URL_INTERNAL: normalizedUrlSchema.optional()
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv
});

console.debug("✅ [ENV_WEB_ISOMORPHIC] Successfully loaded environment variables.");
