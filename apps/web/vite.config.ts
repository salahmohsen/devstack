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
    port: 3000
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
       */
      traceDeps: ["react", "react-dom"],
      /**
       * Don't bundle `pg` (and its native binding `pg-native`) into the
       * SSR output. Nitro tree-shakes or stubs `pg` during bundling, and
       * the stub is what produced the runtime
       * `TypeError: Class extends value #<Object> is not a constructor`
       * in the web app. Externalising lets Node's `require('pg')` resolve
       * the real package at runtime.
       */
      externals: {
        external: ["pg", "pg-native", "drizzle-orm/node-postgres"]
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
});
