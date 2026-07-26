import { resolve } from "node:path";

import { ohImage } from "@lonik/oh-image/plugin";
import mdx from "@mdx-js/rollup";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite-plus";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

// FIRST import — patches fs.watch before other modules open FSEvents.
// Relative path is required here: this is Vite tooling config, not app FSD.
// oxlint-disable-next-line fsd/no-relative-imports
import "./vite-emfile-guard";

// Stub out shiki in the Nitro SSR build to prevent bundling all
// language grammars and the oniguruma WASM binary.
// See similar fix in diffkit, apps/dashboard/vite.config.ts.
function shikiSSRStub() {
  const SHIKI_RE = /^(shiki|@shikijs\/)/;
  const DEFAULT_STUB = `
export const bundledLanguages = {};
export const bundledThemes = {};
export const createHighlighter = () => Promise.resolve({});
export const createJavaScriptRegexEngine = () => ({});
export const createOnigurumaEngine = () => Promise.resolve({});
export const createCssVariablesTheme = () => ({});
export const codeToHtml = () => "";
export const normalizeTheme = (t) => t;
export const getTokenStyleObject = () => ({});
export const stringifyTokenStyle = () => "";
export const transformerStyleToClass = () => ({});
export default {};`;
  const CORE_STUB = `
const mockHighlighter = {};
export async function createHighlighterCore() {
  return mockHighlighter;
}
export function createHighlighterCoreSync() {
  return mockHighlighter;
}
export const getSingletonHighlighterCore = createHighlighterCore;
export function makeSingletonHighlighterCore(fn) {
  return (opts) => fn(opts);
}
export function isPlainLang(lang) {
  return !lang || ["plaintext", "txt", "text", "plain"].includes(lang);
}
export function isSpecialLang(lang) {
  return lang === "ansi" || isPlainLang(lang);
}
export function isNoneTheme(theme) {
  return theme === "none";
}
export function isSpecialTheme(theme) {
  return isNoneTheme(theme);
}`;
  const LANG_STUB = "export default [];";
  const THEME_STUB = "export default Object.freeze({});";

  return {
    name: "shiki-ssr-stub",
    enforce: "pre",
    resolveId(source: string) {
      // Nitro server build environment names vary; stub for any non-client env
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (this as any).environment as { name: string } | undefined;
      const isNitro = env != null && env.name !== "client" && env.name !== "browser";
      if (isNitro && SHIKI_RE.test(source)) {
        return "\0shiki-stub:" + source;
      }
    },
    load(id: string) {
      if (!id.startsWith("\0shiki-stub:")) {
        return;
      }
      const source = id.slice("\0shiki-stub:".length);
      if (
        source === "shiki/core" ||
        source === "@shikijs/core" ||
        source.startsWith("@shikijs/core/")
      ) {
        return CORE_STUB;
      }
      if (source.startsWith("@shikijs/langs/")) {
        return LANG_STUB;
      }
      if (source.startsWith("@shikijs/themes/")) {
        return THEME_STUB;
      }
      return DEFAULT_STUB;
    }
  };
}

export default defineConfig({
  /**
   * FIXME: This is needed for prerendering to work in Docker Compose builds
   * @see {@link https://github.com/TanStack/router/issues/6275}
   */
  preview: {
    host: "127.0.0.1"
  },
  base: new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname,
  // Restart the dev server when env files in this directory change
  envDir: resolve(import.meta.dirname, "../../packages/env"),
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src")
    },
    tsconfigPaths: true
  },
  define: {
    __BUILD_NODE_ENV__: JSON.stringify(ENV_WEB_SERVER.NODE_ENV),
    __BUILD_SOURCE_COMMIT__: JSON.stringify(ENV_WEB_SERVER.SOURCE_COMMIT)
  },
  server: {
    // Bind IPv4+IPv6. Default "localhost" is often [::1] only on macOS, so
    // http://127.0.0.1:3000 fails while http://localhost:3000 works.
    host: true,
    port: 3000,
    // Native FSEvents on this monorepo hits EMFILE even with ulimit ~1M
    // (macOS FSEvents stream limit / pnpm + workspace crawl, not RLIMIT_NOFILE).
    //
    // Important: when fsevents is available, useFsEvents defaults true and
    // SUPERSEDES usePolling. Must set useFsEvents:false for polling to apply.
    // Opt back into native: VITE_USE_POLLING=0
    watch: {
      followSymlinks: false,
      useFsEvents: process.env.VITE_USE_POLLING === "0",
      usePolling: process.env.VITE_USE_POLLING !== "0",
      interval: 400,
      binaryInterval: 800,
      ignorePermissionErrors: true,
      ignored(watchPath: string) {
        const p = watchPath.replaceAll("\\", "/");
        return (
          p.includes("/node_modules/") ||
          p.endsWith("/node_modules") ||
          p.includes("/.pnpm/") ||
          p.includes("/.git/") ||
          p.includes("/.worktrees/") ||
          p.includes("/dist/") ||
          p.includes("/.output/") ||
          p.includes("/.vinxi/") ||
          p.includes("/.nitro/") ||
          p.includes("/.mastra/") ||
          p.includes("/coverage/") ||
          p.includes("/.turbo/") ||
          p.includes("/playwright-report/") ||
          p.includes("/test-results/") ||
          p.includes("/apps/agent/.mastra/")
        );
      }
    }
  },
  /**
   * Vite's dev SSR externalization. `rollupConfig.external` inside the
   * `nitro()` plugin only affects the production Rollup build — in `dev`
   * Vite's SSR runtime pre-bundles deps via esbuild and re-instantiates
   * the module per request, which made the lazy `pg.Pool` proxy in
   * `@tsu-stack/db` open a fresh pool every SSR request and exhaust
   * Postgres with `FATAL: too many clients already`. Listing the native
   * driver packages here tells Vite to load them through Node's `require`
   * so the singleton stays stable across requests.
   *
   * In `build`, the same externalisation produces `.output/server/_ssr/`
   * chunks with `import "drizzle-orm"` / `import "pg"` statements. The
   * Dockerfile runs `pnpm deploy` so `.output/node_modules/` contains
   * those packages; Node resolves them by walking up from the SSR chunk.
   */
  ssr: {
    external: ["pg", "pg-native", "drizzle-orm/node-postgres"]
  },
  plugins: [
    shikiSSRStub(),
    /**
     * Tailwind CSS v4 Vite plugin — processes app.css (and its import chain
     * into @tsu-stack/ui/styles/*) for utility generation + CSS bundling.
     * Keep early so downstream plugins see final CSS. No tailwind.config.js;
     * theme tokens live in CSS (@theme / @import chain).
     * @see {@link https://tailwindcss.com/docs/installation/using-vite}
     */
    tailwindcss(),
    devtools({
      consolePiping: { enabled: false }
    }),
    mdx(),
    tanstackStart({
      // Prerender disabled — blocked by nitro@3 + TanStack Start race condition
      // (TanStack/router#6275, #6322). Re-enable when nitro@4 ships.
      prerender: {
        enabled: false
      },
      server: {
        build: {
          // Don't allow changing of process.env.NODE_ENV at runtime
          staticNodeEnv: true
        }
      }
    }),
    viteReact(),
    /** @see {@link https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler} */
    babel({
      presets: [reactCompilerPreset()]
    }),
    /** @see {@link https://tanstack.com/start/latest/docs/framework/react/guide/hosting} */
    nitro({
      baseURL: new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname,
      /**
       * Externalise the native DB driver packages in the main Nitro
       * Rollup pass. The `tanstackStart` SSR service already externalises
       * them in its own build (see `ssr.external` above); the chunks
       * under `.output/server/_ssr/` carry bare `import "pg"` /
       * `import "drizzle-orm/node-postgres"` statements. The main Nitro
       * build then re-processes those chunks and would try to resolve
       * the subpath `drizzle-orm/node-postgres` via Rolldown's module
       * resolver, which fails on the subpath export map. Marking them
       * external here leaves the imports as-is; the production image
       * provides them via monorepo `node_modules` so Node ESM resolves
       * them at runtime.
       */
      rollupConfig: {
        external: ["pg", "pg-native", "drizzle-orm/node-postgres"]
      },
      /**
       * CJS interop fix for `pg` (and `pg-pool` via `pg`).
       *
       * `pg@8.22.0`'s `lib/index.js` does `class BoundPool extends Pool`
       * where `Pool = require('pg-pool')`. When rolldown bundles CJS
       * transitively (e.g. via Nitro's own Rollup pass that consumes the
       * SSR service output), the CommonJS plugin wraps `pg-pool`'s
       * `module.exports = PoolClass` as `{ default: PoolClass }` by
       * default. The `extends` then sees an object and throws:
       *   `TypeError: Class extends value #<Object> is not a constructor`
       *   at poolFactory (...src-*.mjs)
       *
       * `requireReturnsDefault: "auto"` makes the CJS plugin unwrap a
       * CJS module whose `module.exports` *is* a constructor and return
       * it directly, restoring the `extends` chain.
       *
       * @see {@link https://nitro.build/config#build-commonjs}
       */
      commonJS: {
        requireReturnsDefault: "auto"
      }
    }),
    ohImage({
      pl_show: true,
      transforms: {
        format: "webp",
        quality: 80
      }
    })
  ]
});
