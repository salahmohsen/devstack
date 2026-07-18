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

import { type FileRouteTypes } from "@/routeTree.gen";

const ROUTES_TO_PRERENDER: FileRouteTypes["fullPaths"][] = ["/sitemap.xml", "/robots.txt"];

const PAGES_PRERENDER_CONFIG = ROUTES_TO_PRERENDER.map((path) => {
  return {
    path: path,
    prerender: { enabled: true }
  };
});

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
    devtools({
      consolePiping: { enabled: false }
    }),
    mdx(),
    tanstackStart({
      pages: PAGES_PRERENDER_CONFIG,
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        concurrency: 4
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
      traceDeps: ["react", "react-dom"]
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
