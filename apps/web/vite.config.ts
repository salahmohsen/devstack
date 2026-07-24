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

// `vite-plus@0.2.1`'s `defineConfig` types only accept a plain object,
// but Vite (and `vite-plus` at runtime) accept a function that receives
// `{ command }` and returns a config. We need the function form to make
// `ssr.external` / `ssr.noExternal` conditional on dev vs build without
// breaking the dev pool-singleton fix. The transitive type from
// `vite-plus-core@0.2.6` (used by the Nitro plugin) collides with the
// `0.2.1` type of the imported `defineConfig`, so the function form
// fails structurally. The runtime is fine.
// @ts-expect-error -- vite-plus@0.2.1 defineConfig type lacks the function form
export default defineConfig(({ command }: { command: "build" | "serve" }) => {
  const isBuild = command === "build";
  return {
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
      port: 3000
    },
    /**
     * SSR externalization is environment-specific.
     *
     * In `dev`, `tanstackStart` creates a Vite SSR service that
     * re-instantiates pre-bundled deps per request. Externalising the
     * native DB driver packages lets Vite load them through Node's
     * `require`, keeping the `pg.Pool` singleton stable across requests
     * (otherwise every SSR request opens a fresh pool and exhausts
     * Postgres with `FATAL: too many clients already`).
     *
     * In `build`, the same SSR service produces the `.output/server/_ssr/`
     * chunks. Those chunks run inside the production container, which
     * only ships `.output/` (no `node_modules/`). If `drizzle-orm` and
     * `pg` are left as external `import` statements there, Node ESM
     * throws `ERR_MODULE_NOT_FOUND` at first request. `ssr.noExternal`
     * (which takes priority over `ssr.external` per Vite docs) forces
     * those packages to be bundled into the SSR chunks, so no runtime
     * resolve is needed. The CJS interop fix in the `nitro({ commonJS })`
     * block below keeps the bundled `pg` working.
     */
    ssr: {
      external: isBuild ? [] : ["pg", "pg-native", "drizzle-orm/node-postgres"],
      noExternal: isBuild
        ? ["drizzle-orm", "drizzle-orm/node-postgres", "pg", "pg-pool", "pg-native"]
        : []
    },
    plugins: [
      shikiSSRStub(),
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
         * We need to add this or else we will get `Error: Cannot find module 'react'` during prod.
         * FIXME: I haven't found a fix or related issue yet, but this is where I got the idea to trace the deps:
         * @see {@link https://github.com/nuxt/nuxt/issues/20773}
         * Recent Discord discussion on the matter
         * @see {@link https://discord.com/channels/719702312431386674/1490005967067414608}
         *
         * `react` / `react-dom` are externalised by the SSR service env
         * and need to be copied into `.output/node_modules/` so the
         * production container (which only ships `.output/`) can resolve
         * them. `drizzle-orm` and `pg` are no longer here — they're
         * bundled into the SSR chunks by `ssr.noExternal` above.
         *
         * @see {@link https://nitro.build/config#build-tracedeps}
         */
        traceDeps: ["react", "react-dom"],
        /**
         * CJS interop fix for `pg` (and `pg-pool` via `pg`).
         *
         * `pg@8.22.0`'s `lib/index.js` does `class BoundPool extends Pool`
         * where `Pool = require('pg-pool')`. When rolldown bundles this
         * for Nitro's `_ssr/` output, the Rollup CommonJS plugin wraps
         * `pg-pool`'s `module.exports = PoolClass` as
         * `{ default: PoolClass }` by default. The `extends` then sees an
         * object and throws:
         *   `TypeError: Class extends value #<Object> is not a constructor`
         *   at poolFactory (...src-DTTaCAoo.mjs)
         *
         * `requireReturnsDefault: "auto"` makes the CJS plugin unwrap a
         * CJS module whose `module.exports` *is* a constructor (class /
         * function) and return it directly, restoring the `extends` chain.
         *
         * @see {@link https://nitro.build/config#build-commonjs}
         */
        commonJS: {
          requireReturnsDefault: "auto"
        }
      }),
      tailwindcss(),
      ohImage({
        pl_show: true,
        transforms: {
          format: "webp",
          quality: 80
        }
      })
    ]
  };
});
