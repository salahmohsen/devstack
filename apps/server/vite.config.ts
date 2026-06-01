import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite-plus";

import { normalizeUrlString } from "@tsu-stack/env/utils/url";

const DEFAULT_SERVER_URL = "http://localhost:5000/server";
const configuredServerUrl =
  process.env.VITE_SERVER_URL ??
  (process.env.NODE_ENV === "production" ? undefined : DEFAULT_SERVER_URL);

const devServerPort = configuredServerUrl
  ? Number(new URL(normalizeUrlString(configuredServerUrl)).port || 5000)
  : 5000;

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: "cross-env IS_BUILD=true vp build"
      }
    }
  },
  plugins: [cloudflare({ inspectorPort: false })],
  server: {
    // Hono's CORS middleware should own preflight handling in dev; Hono docs
    // recommend disabling Vite's built-in CORS when using Hono with Vite:
    // https://hono.dev/middleware/builtin/cors
    cors: false,
    port: devServerPort
  }
});
