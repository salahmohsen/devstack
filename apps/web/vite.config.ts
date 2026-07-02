import { resolve } from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import { ohImage } from "@lonik/oh-image/plugin";
import mdx from "@mdx-js/rollup";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import { defineConfig } from "vite-plus";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

import { type FileRouteTypes } from "@/routeTree.gen";

const ROUTES_TO_PRERENDER: FileRouteTypes["fullPaths"][] = ["/sitemap.xml", "/robots.txt"];

const PAGES_PRERENDER_CONFIG = ROUTES_TO_PRERENDER.map((path) => {
  return {
    path: path,
    prerender: { enabled: true }
  };
});

// Stub out shiki in the SSR (Cloudflare Worker) environment to prevent all
// language grammars (~1.5 MB) from being bundled. Shiki is only used
// client-side so the server never needs the real implementation.
// oxlint-disable-next-line typescript/consistent-type-imports
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

// Stub out the icon group files in the SSR (Cloudflare Worker) environment to
// prevent all 31 react-icons re-exports (~40 MiB of SSR chunks) from being
// deployed as Worker modules. The icon-picker's loadGroup() is only called
// from useEffect (client-only), so the SSR never needs the real icon data.
// oxlint-disable-next-line typescript/consistent-type-imports
function iconGroupsSSRStub(): import("vite").Plugin {
  const GROUP_RE = /^\.\/icons\/group-\d{2}$/;
  return {
    name: "icon-groups-ssr-stub",
    enforce: "pre",
    resolveId: {
      handler(source) {
        if (this.environment?.name === "ssr" && GROUP_RE.test(source)) {
          return `\0icon-group-stub:${source}`;
        }
      }
    },
    load(id) {
      if (id.startsWith("\0icon-group-stub:")) {
        return "export const iconLibraries = {};";
      }
    }
  };
}

const plugins: unknown[] = [];
plugins.push(
  devtools({
    consolePiping: { enabled: false }
  }),
  cloudflare({
    viteEnvironment: { name: "ssr" }
  }),
  tanstackStart({
    pages: PAGES_PRERENDER_CONFIG,
    prerender: {
      enabled: true,
      // Only prerender paths defined in the PAGES_PRERENDER_CONFIG object
      autoStaticPathsDiscovery: false,
      crawlLinks: false,
      // Cloudflare Pages build env has ~256 PID limit; high concurrency
      // spawns too many child processes and hits EAGAIN.
      concurrency: 2
    },
    server: {
      build: {
        // Don't allow changing of process.env.NODE_ENV at runtime
        staticNodeEnv: true
      }
    }
  }),
  shikiSSRStub(),
  iconGroupsSSRStub(),
  mdx(),
  viteReact(),
  /** @see {@link https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler} */
  babel({
    presets: [reactCompilerPreset()]
  }),
  tailwindcss(),
  ohImage({
    pl_show: true,
    transforms: {
      format: "webp",
      quality: 80
    }
  }),
  ...(!process.env.IS_BUILD
    ? [
        checker({
          typescript: true
        })
      ]
    : [])
);

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: `cross-env NODE_OPTIONS="--max-old-space-size=2048" CLOUDFLARE_INCLUDE_PROCESS_ENV=true IS_BUILD=true pnpm dotenvx run -f ../../packages/env/.env -- vp build`,
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
  build: {
    // Skip gzip size computation to avoid spawning child processes per chunk
    // in the Cloudflare build env (256 PID limit → EAGAIN with 100+ SSR chunks).
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Split large server-only dependencies into their own SSR chunks to
        // stay under Cloudflare's 3 MiB per-module Worker size limit. The main
        // src chunk (3.2 MiB) bundles better-auth, marked, and drizzle-orm
        // along with all application code; these splits reclaim ~800 KiB.
        manualChunks(id) {
          if (id.includes("/better-auth/") || id.includes("/@better-auth/")) return "server-auth";
          if (id.includes("/marked/") || id.includes("/prismjs/")) return "server-content";
          if (id.includes("/drizzle-orm/")) return "server-db";
        }
      },
      onwarn(warning, warn) {
        const msg = typeof warning === "string" ? warning : (warning.message ?? "");
        if (msg.includes("externalized for browser compatibility") && msg.includes("evlog")) return;
        warn(warning);
      },
      // The @aws-sdk packages are files-sdk optional peer deps. We use the
      // r2 binding adapter, so the S3 chunk is never loaded at runtime. Mark
      // them external in the server build to keep their chunks out of dist/ and
      // avoid hitting the Cloudflare build env's PID limit from too many chunks.
      external: (id) => id.startsWith("@aws-sdk/")
    }
  },
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
