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

/** Vitest sets this when loading config for `vp test` — skip full app plugins. */
const isVitest = Boolean(process.env.VITEST);

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

// PluginOption types can diverge across duplicate vite-plus-core versions in the
// monorepo graph (TS2321/TS2769 on defineConfig plugins). Cast keeps runtime config
// intact without blocking pre-commit typecheck.
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
  // Unit tests: co-located `*.test.ts` under src (pure helpers only; no full app bootstrap).
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Full TanStack Start / Nitro plugin graph leaves handles open after unit tests.
    pool: "forks",
    fileParallelism: false
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src")
    },
    tsconfigPaths: true,
    // assistant-ui doctor: one core instance. Vite can still instantiate
    // react + react-ai-sdk copies separately without this.
    dedupe: [
      "@assistant-ui/core",
      "@assistant-ui/store",
      "@assistant-ui/tap",
      "@assistant-ui/react",
      "@assistant-ui/react-ai-sdk"
    ]
  },
  define: {
    __BUILD_NODE_ENV__: JSON.stringify(ENV_WEB_SERVER.NODE_ENV),
    __BUILD_SOURCE_COMMIT__: JSON.stringify(ENV_WEB_SERVER.SOURCE_COMMIT)
  },
  server: {
    // Explicit IPv4 so 127.0.0.1 and localhost both work on macOS.
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    // Default: native FSEvents. Polling (VITE_USE_POLLING=1) can leave Vite
    // accepting TCP on :3000 but never completing HTTP responses.
    // When fsevents is available, useFsEvents SUPERSEDES usePolling — set
    // useFsEvents:false only when polling is requested.
    watch: {
      followSymlinks: false,
      useFsEvents: process.env.VITE_USE_POLLING !== "1",
      usePolling: process.env.VITE_USE_POLLING === "1",
      interval: 400,
      binaryInterval: 800,
      ignorePermissionErrors: true,
      // Prefer globs (cheaper) + function for path-segment edge cases.
      // Watching monorepo noise (node_modules, agent mastra, dist) is a
      // common EMFILE trigger even with a high ulimit.
      //
      // IMPORTANT: do NOT blanket-ignore `**/.worktrees/**` when THIS app is
      // running from a git worktree under `.worktrees/<name>/`. Absolute paths
      // then all contain `/.worktrees/`, so HMR would ignore every source file
      // and only a full restart would pick up changes.
      ignored: [
        "**/node_modules/**",
        "**/.pnpm/**",
        "**/.git/**",
        // Only when not running inside a worktree (see shouldIgnoreWatchPath).
        ...(!resolve(import.meta.dirname, "../..")
          .replaceAll("\\", "/")
          .includes("/.worktrees/")
          ? (["**/.worktrees/**"] as const)
          : []),
        "**/dist/**",
        "**/.output/**",
        "**/.vinxi/**",
        "**/.nitro/**",
        "**/.mastra/**",
        "**/coverage/**",
        "**/.turbo/**",
        "**/playwright-report/**",
        "**/test-results/**",
        "**/apps/agent/**",
        "**/apps/server/dist/**",
        (watchPath: string) => {
          const p = watchPath.replaceAll("\\", "/");
          const monorepoRoot = resolve(import.meta.dirname, "../..").replaceAll("\\", "/");
          const runningInsideWorktree = monorepoRoot.includes("/.worktrees/");

          if (
            p.includes("/node_modules/") ||
            p.endsWith("/node_modules") ||
            p.includes("/.pnpm/") ||
            p.includes("/.git/") ||
            p.includes("/dist/") ||
            p.includes("/.output/") ||
            p.includes("/.vinxi/") ||
            p.includes("/.nitro/") ||
            p.includes("/.mastra/") ||
            p.includes("/coverage/") ||
            p.includes("/.turbo/") ||
            p.includes("/playwright-report/") ||
            p.includes("/test-results/") ||
            p.includes("/apps/agent/")
          ) {
            return true;
          }

          // Ignore other worktrees, but never ignore our own root when we are one.
          if (p.includes("/.worktrees/")) {
            if (runningInsideWorktree) {
              const rootPrefix = monorepoRoot.endsWith("/") ? monorepoRoot : `${monorepoRoot}/`;
              if (p === monorepoRoot || p.startsWith(rootPrefix)) {
                return false;
              }
              return true;
            }
            return true;
          }

          return false;
        }
      ]
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
  // App plugins (TanStack Start, Nitro, React, …) hang `vp test` on exit and are
  // unnecessary for pure unit tests under `src/**/*.test.ts`.
  plugins: isVitest
    ? []
    : [
        shikiSSRStub(),
        /**
         * Tailwind CSS v4 Vite plugin — processes app.css (and its import chain
         * into @tsu-stack/ui/styles/*) for utility generation + CSS bundling.
         * Keep early so downstream plugins see final CSS. No tailwind.config.js;
         * theme tokens live in CSS (@theme / @import chain).
         * @see {@link https://tailwindcss.com/docs/installation/using-vite}
         */
        tailwindcss(),
        /**
         * TanStack Devtools Vite plugin (@tanstack/devtools-vite 0.8).
         *
         * 0.8 can also bridge isolated server runtimes (Nitro worker) over Vite's
         * HotChannel, but the dedicated event bus still defaults to :4206.
         * Two failure modes we hit on this monorepo:
         * 1) Stale process holds 4206 → next start throws EADDRINUSE and never binds
         *    :3000 (server/agent still start via `vp run dev`, so it "looks fine").
         * 2) With the bus enabled, configureServer can stall before Vite listens on
         *    :3000 (process idle with only :4206 open). Disable the bus for reliable
         *    local boot; browser Devtools panels still work without server event bus.
         * scripts/dev.sh frees 3000/4206 on start and stop as a belt-and-suspenders.
         */
        devtools({
          eventBusConfig: {
            enabled: false
          },
          consolePiping: { enabled: false },
          injectSource: { enabled: false },
          enhancedLogs: { enabled: false }
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite-plus PluginOption skew
} as any);
