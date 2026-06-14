import { resolve } from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import { ohImage } from "@lonik/oh-image/plugin";
import mdx from "@mdx-js/rollup";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";
import { locales } from "@tsu-stack/i18n/runtime";
import { paraglideVitePlugin } from "@tsu-stack/i18n/vite/plugin";

import { type FileRouteTypes } from "@/routeTree.gen";

/**
 * IMPORTANT: We define this explicitly here instead of crawling from the root (/) because
 * crawling can sometimes miss i18n routes that are not directly linked from the root.
 * We type it as FileRouteTypes['fullPaths'][] since prerender needs to have the `/` suffix or else we will get `Error: redirect count exceeded` on build.
 */
const ROUTES_TO_PRERENDER: FileRouteTypes["fullPaths"][] = [
  "/{-$locale}/privacy-policy/",
  "/sitemap.xml",
  "/robots.txt"
];

const PAGES_PRERENDER_CONFIG = [
  // Also prerender the default locale without the locale prefix
  ...ROUTES_TO_PRERENDER.map((path) => {
    return {
      path: path.replace("{-$locale}/", ""),
      prerender: { enabled: true }
    };
  }),
  // Prerender all locales with their locale prefix (including base locale since the prefix is removed on the client via router)
  ...locales.flatMap((loc) =>
    ROUTES_TO_PRERENDER.map((path) => {
      return {
        path: path.replace("{-$locale}", loc),
        prerender: { enabled: true }
      };
    })
  )
];

// Stub out shiki in the SSR (Cloudflare Worker) environment to prevent all
// language grammars (~1.5 MB) from being bundled. Shiki is only used
// client-side so the server never needs the real implementation.
function shikiSSRStub(): import("vite").Plugin {
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

  // "shiki/core" re-exports "@shikijs/core" (fine-grained / createHighlighterCore).
  // "@shikijs/rehype" imports isSpecialLang from "shiki/core" during SSR analysis.
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
    resolveId: {
      handler(source) {
        if (this.environment?.name === "ssr" && SHIKI_RE.test(source)) {
          return `\0shiki-stub:${source}`;
        }
      }
    },
    load(id) {
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

const plugins: unknown[] = [];
plugins.push(
  devtools({
    consolePiping: { enabled: false }
  }),
  shikiSSRStub(),
  mdx(),
  cloudflare({
    viteEnvironment: { name: "ssr" }
  }),
  tanstackStart({
    pages: PAGES_PRERENDER_CONFIG,
    prerender: {
      enabled: true,
      // Only prerender paths defined in the PAGES_PRERENDER_CONFIG object
      autoStaticPathsDiscovery: false,
      // Disable crawling to avoid missing i18n routes, we are explicitly defining them in PAGES_PRERENDER_CONFIG
      crawlLinks: false
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
  paraglideVitePlugin({
    basePath: new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname
  }),
  tailwindcss(),
  ohImage({
    pl_show: true,
    transforms: {
      format: "webp",
      quality: 80
    }
  })
);

export default defineConfig({
  run: {
    tasks: {
      build: {
        command:
          "cross-env CLOUDFLARE_INCLUDE_PROCESS_ENV=true IS_BUILD=true pnpm dotenvx run -f ../../packages/env/.env -- vp build",
        dependsOn: ["@tsu-stack/i18n#build"],
        // These environment variables are dependencies of the build process and need to be passed here to be picked up by the Vite Task runner.
        // CAUTION: These are hardcoded into the image. You should consider Build Secrets for sensitive values.
        //          In Coolify, you need to check "Use Docker Build Secrets" in the Environment Variables tab.
        env: [
          "NODE_ENV",
          "VITE_SERVER_URL",
          "VITE_WEB_URL",
          "VITE_IMGPROXY_URL",
          "SOURCE_COMMIT",
          "BETTER_AUTH_SECRET",
          "DATABASE_URL"
        ]
      }
    }
  },

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
    tsconfigPaths: true
  },
  define: {
    __BUILD_NODE_ENV__: JSON.stringify(ENV_WEB_SERVER.NODE_ENV),
    __BUILD_SOURCE_COMMIT__: JSON.stringify(ENV_WEB_SERVER.SOURCE_COMMIT)
  },
  server: {
    port: 3000
  },
  plugins: plugins as unknown as []
});
