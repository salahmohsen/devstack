/**
 * Known same-product npm package families used by organize + detect merge steps.
 * Survivor preference follows list order (first package is the preferred primary).
 *
 * Curated from real monorepos under ~/Developer (personal-hub, tsu-stack, alouf-*,
 * tanstack starters, payload, mastra, affine, etc.) plus common ecosystem pairs.
 *
 * Rules:
 * - One family = one portfolio stack (same product / same library).
 * - Multi-product orgs (e.g. @tanstack/*) stay as **separate** families per product.
 * - Internal monorepo packages (@tsu-stack/*, @repo/*) are never listed here.
 * - Mono-product scopes that should all collapse are listed in SCOPE_MERGE_ALLOWLIST.
 */
export const SAME_PROJECT_PACKAGE_FAMILIES: readonly (readonly string[])[] = [
  // ── Core UI runtimes ──
  ["react", "react-dom", "@types/react", "@types/react-dom", "babel-plugin-react-compiler"],
  [
    "next",
    "eslint-config-next",
    "@next/eslint-plugin-next",
    "next-themes",
    "next-intl",
    "@types/next"
  ],
  [
    "vue",
    "@vue/compiler-sfc",
    "@vue/runtime-dom",
    "@vue/runtime-core",
    "@vue/shared",
    "vue-tsc",
    "@types/vue"
  ],
  ["svelte", "@sveltejs/kit", "@sveltejs/vite-plugin-svelte"],
  ["solid-js", "vite-plugin-solid"],
  ["preact", "@preact/preset-vite", "@preact/signals-core"],
  ["lit", "lit-html"],
  [
    "@angular/core",
    "@angular/common",
    "@angular/compiler",
    "@angular/compiler-cli",
    "@angular/platform-browser",
    "@angular/platform-browser-dynamic",
    "@angular/router",
    "@angular/forms",
    "@angular/animations",
    "@angular/cdk",
    "@angular/cli"
  ],
  // ── Data / ORM ──
  ["prisma", "@prisma/client"],
  [
    "drizzle-orm",
    "drizzle-kit",
    "drizzle-zod",
    "drizzle-valibot",
    "drizzle-typebox",
    "drizzle-seed"
  ],
  ["pg", "postgres", "@types/pg"],
  ["better-sqlite3", "@types/better-sqlite3"],
  // ── Bundlers / tooling ──
  [
    "vite",
    "@vitejs/plugin-react",
    "@vitejs/plugin-react-swc",
    "@vitejs/plugin-vue",
    "@vitejs/plugin-svelte",
    "vite-tsconfig-paths",
    "vite-plugin-checker",
    "vite-node",
    "vite-plus"
  ],
  ["webpack", "webpack-cli", "webpack-dev-server"],
  ["rollup", "@rollup/plugin-commonjs", "@rollup/plugin-node-resolve", "@rollup/plugin-typescript"],
  ["wrangler", "@cloudflare/workers-types", "@cloudflare/vite-plugin"],
  ["dotenv", "dotenv-expand", "dotenv-cli"],
  // ── Lint / format ──
  [
    "eslint",
    "@eslint/js",
    "@eslint/eslintrc",
    "@eslint/compat",
    "@typescript-eslint/parser",
    "@typescript-eslint/eslint-plugin",
    "eslint-config-prettier",
    "eslint-plugin-react",
    "eslint-plugin-react-hooks",
    "eslint-plugin-react-refresh",
    "eslint-plugin-jsx-a11y",
    "eslint-plugin-import",
    "eslint-import-resolver-typescript",
    "eslint-plugin-prettier"
  ],
  ["prettier", "prettier-plugin-organize-imports"],
  ["oxlint", "oxlint-tsgolint", "oxlint-tailwindcss"],
  // ── Testing ──
  [
    "vitest",
    "@vitest/ui",
    "@vitest/coverage-v8",
    "@vitest/coverage-istanbul",
    "@vitest/browser",
    "@vitest/browser-playwright"
  ],
  ["jest", "@jest/globals", "ts-jest", "babel-jest", "@types/jest"],
  [
    "@testing-library/react",
    "@testing-library/dom",
    "@testing-library/jest-dom",
    "@testing-library/user-event",
    "@testing-library/vue",
    "@testing-library/angular",
    "@testing-library/preact",
    "@testing-library/svelte"
  ],
  ["playwright", "@playwright/test"],
  [
    "storybook",
    "@storybook/react",
    "@storybook/react-vite",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/addon-onboarding",
    "@storybook/blocks",
    "@storybook/test"
  ],
  ["jsdom", "happy-dom"],
  // ── TanStack (one family per product) ──
  [
    "@tanstack/react-query",
    "@tanstack/react-query-devtools",
    "@tanstack/react-query-persist-client",
    "@tanstack/eslint-plugin-query",
    "@tanstack/query-db-collection"
  ],
  [
    "@tanstack/react-router",
    "@tanstack/react-router-devtools",
    "@tanstack/router-devtools",
    "@tanstack/router-plugin",
    "@tanstack/router-cli",
    "@tanstack/eslint-plugin-router",
    "@tanstack/react-router-with-query",
    "@tanstack/react-router-ssr-query",
    "@tanstack/zod-adapter"
  ],
  [
    "@tanstack/react-form",
    "@tanstack/form-core",
    "@tanstack/react-form-devtools",
    "@tanstack/form-devtools",
    "@tanstack/react-form-start",
    "@tanstack/react-form-nextjs",
    "@tanstack/react-form-remix",
    "@tanstack/solid-form",
    "@tanstack/vue-form",
    "@tanstack/svelte-form",
    "@tanstack/angular-form",
    "@tanstack/lit-form",
    "@tanstack/preact-form"
  ],
  ["@tanstack/react-table", "@tanstack/match-sorter-utils"],
  ["@tanstack/react-start", "@tanstack/nitro-v2-vite-plugin"],
  [
    "@tanstack/react-store",
    "@tanstack/store",
    "@tanstack/solid-store",
    "@tanstack/vue-store",
    "@tanstack/svelte-store",
    "@tanstack/preact-store",
    "@tanstack/lit-store",
    "@tanstack/angular-store"
  ],
  ["@tanstack/db", "@tanstack/react-db"],
  [
    "@tanstack/react-devtools",
    "@tanstack/devtools-vite",
    "@tanstack/devtools-a11y",
    "@tanstack/devtools-utils",
    "@tanstack/devtools-event-client",
    "@tanstack/devtools-ui",
    "@tanstack/solid-devtools"
  ],
  ["better-auth", "@better-auth/core", "@better-auth/drizzle-adapter", "@better-auth/passkey"],
  [
    "next-auth",
    "@auth/core",
    "@auth/prisma-adapter",
    "@auth/drizzle-adapter",
    "@next-auth/prisma-adapter"
  ],
  // ── RPC / API ──
  [
    "@orpc/server",
    "@orpc/client",
    "@orpc/tanstack-query",
    "@orpc/json-schema",
    "@orpc/openapi",
    "@orpc/zod"
  ],
  ["@trpc/server", "@trpc/client", "@trpc/react-query", "@trpc/tanstack-react-query", "@trpc/next"],
  ["hono", "@hono/node-server", "@hono/zod-validator"],
  ["express", "express-rate-limit", "express-mongo-sanitize", "@types/express"],
  // ── AI ──
  [
    "ai",
    "@ai-sdk/react",
    "@ai-sdk/openai",
    "@ai-sdk/anthropic",
    "@ai-sdk/google",
    "@ai-sdk/google-vertex",
    "@ai-sdk/vercel",
    "@ai-sdk/groq"
  ],
  [
    "mastra",
    "@mastra/core",
    "@mastra/loggers",
    "@mastra/observability",
    "@mastra/memory",
    "@mastra/evals",
    "@mastra/duckdb",
    "@mastra/ai-sdk",
    "@mastra/pg",
    "@mastra/libsql",
    "@mastra/auth-better-auth",
    "@mastra/mcp",
    "@mastra/rag"
  ],
  ["@openai/agents", "@openai/agents-extensions"],
  // ── CSS / UI kits ──
  [
    "tailwindcss",
    "@tailwindcss/vite",
    "@tailwindcss/postcss",
    "@tailwindcss/typography",
    "@tailwindcss/forms",
    "@tailwindcss/cli",
    "prettier-plugin-tailwindcss",
    "tailwindcss-animate",
    "tw-animate-css",
    "eslint-plugin-tailwindcss"
  ],
  ["tailwind-merge", "tailwind-variants"],
  ["postcss", "autoprefixer", "postcss-import", "postcss-nesting", "postcss-preset-env"],
  ["motion", "framer-motion"],
  ["styled-components", "@types/styled-components"],
  ["@emotion/react", "@emotion/styled", "@emotion/css", "@emotion/cache", "@emotion/hash"],
  [
    "radix-ui",
    "@radix-ui/react-slot",
    "@radix-ui/react-dialog",
    "@radix-ui/react-label",
    "@radix-ui/react-popover",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-select",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-avatar",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-collapsible",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-separator",
    "@radix-ui/react-progress",
    "@radix-ui/react-tabs",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-slider",
    "@radix-ui/react-toggle",
    "@radix-ui/react-aspect-ratio",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-navigation-menu",
    "@radix-ui/react-accordion",
    "@radix-ui/react-hover-card",
    "@radix-ui/react-radio-group",
    "@radix-ui/react-switch",
    "@radix-ui/react-toast",
    "@radix-ui/react-toggle-group",
    "@radix-ui/react-menubar",
    "@radix-ui/react-direction",
    "@radix-ui/react-icons",
    "@radix-ui/react-visually-hidden"
  ],
  ["@base-ui/react", "@base-ui-components/react"],
  ["shadcn", "@shadcn/react"],
  ["class-variance-authority", "clsx", "classnames"],
  [
    "react-aria-components",
    "@react-aria/i18n",
    "@react-aria/visually-hidden",
    "@react-aria/ssr",
    "@react-types/shared",
    "@internationalized/date"
  ],
  ["@floating-ui/dom", "@floating-ui/react"],
  ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/modifiers", "@dnd-kit/utilities"],
  [
    "embla-carousel",
    "embla-carousel-react",
    "embla-carousel-autoplay",
    "embla-carousel-wheel-gestures"
  ],
  ["apexcharts", "react-apexcharts"],
  // ── Icons / fonts ──
  ["lucide-react", "lucide-vue-next", "lucide-svelte"],
  ["@iconify/react", "@iconify-json/logos", "@iconify-json/simple-icons", "@iconify-json/mdi"],
  [
    "@fontsource-variable/inter",
    "@fontsource-variable/geist",
    "@fontsource-variable/geist-mono",
    "@fontsource-variable/dm-sans",
    "@fontsource-variable/figtree",
    "@fontsource-variable/oxanium"
  ],
  // ── Forms / validation ──
  ["react-hook-form", "@hookform/resolvers", "@hookform/devtools"],
  ["zod", "zod-to-json-schema", "zod-validation-error", "zod-form-data"],
  // ── State ──
  ["redux", "react-redux", "@reduxjs/toolkit"],
  // ── Routing ──
  ["react-router", "react-router-dom"],
  // ── Editors / content ──
  [
    "@tiptap/react",
    "@tiptap/core",
    "@tiptap/pm",
    "@tiptap/starter-kit",
    "@tiptap/extensions",
    "@tiptap/extension-placeholder",
    "@tiptap/extension-typography",
    "@tiptap/extension-link",
    "@tiptap/extension-color",
    "@tiptap/extension-highlight",
    "@tiptap/extension-horizontal-rule",
    "@tiptap/extension-image",
    "@tiptap/extension-subscript",
    "@tiptap/extension-superscript",
    "@tiptap/extension-text-align",
    "@tiptap/extension-text-style",
    "@tiptap/extension-list",
    "@tiptap/extension-bullet-list",
    "@tiptap/extension-ordered-list",
    "@tiptap/extension-character-count",
    "@tiptap/extension-code-block",
    "@tiptap/extension-code-block-lowlight",
    "@tiptap/extension-collaboration",
    "@tiptap/extension-collaboration-cursor",
    "@tiptap/extension-document",
    "@tiptap/extension-dropcursor",
    "@tiptap/extension-focus",
    "@tiptap/extension-heading",
    "@tiptap/extension-paragraph",
    "@tiptap/extension-table",
    "@tiptap/extension-table-header",
    "@tiptap/extension-table-row",
    "@tiptap/extension-task-item",
    "@tiptap/extension-task-list",
    "@tiptap/extension-underline",
    "@tiptap/suggestion"
  ],
  ["yjs", "lib0"],
  [
    "shiki",
    "highlight.js",
    "prism-react-renderer",
    "rehype-highlight",
    "rehype-raw",
    "rehype-sanitize",
    "rehype-parse",
    "remark-gfm",
    "remark-breaks",
    "remark-math",
    "remark-github-blockquote-alert",
    "unified",
    "marked"
  ],
  // ── CMS ──
  [
    "payload",
    "@payloadcms/ui",
    "@payloadcms/next",
    "@payloadcms/richtext-lexical",
    "@payloadcms/live-preview-react",
    "@payloadcms/admin-bar",
    "@payloadcms/payload-cloud",
    "@payloadcms/plugin-form-builder",
    "@payloadcms/plugin-nested-docs",
    "@payloadcms/plugin-redirects",
    "@payloadcms/plugin-search",
    "@payloadcms/plugin-seo",
    "@payloadcms/db-postgres",
    "@payloadcms/db-vercel-postgres",
    "@payloadcms/db-mongodb",
    "@payloadcms/db-sqlite"
  ],
  // ── Maps / media ──
  ["react-leaflet", "leaflet", "@types/leaflet"],
  ["@lottiefiles/dotlottie-react", "@lottiefiles/dotlottie-wc", "@lottiefiles/lottie-player"],
  // ── HTTP / realtime / infra ──
  ["axios", "axios-retry"],
  ["ofetch", "ky", "undici"],
  ["socket.io", "socket.io-client"],
  ["ws", "@types/ws"],
  ["@grpc/grpc-js", "@grpc/proto-loader"],
  ["ioredis", "redis", "@upstash/redis", "@upstash/ratelimit"],
  ["firebase", "firebase-admin"],
  ["@supabase/supabase-js", "@supabase/auth-helpers-nextjs", "@supabase/ssr"],
  [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "@aws-sdk/s3-presigned-post",
    "@aws-sdk/lib-storage",
    "@aws-sdk/credential-providers"
  ],
  ["react-email", "@react-email/components", "@react-email/ui", "@react-email/preview-server"],
  // ── Observability ──
  [
    "@sentry/react",
    "@sentry/nextjs",
    "@sentry/node",
    "@sentry/vite-plugin",
    "@sentry/esbuild-plugin",
    "@sentry/webpack-plugin",
    "@sentry/electron",
    "@sentry/tanstackstart-react"
  ],
  [
    "@opentelemetry/api",
    "@opentelemetry/core",
    "@opentelemetry/sdk-node",
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/sdk-metrics",
    "@opentelemetry/resources",
    "@opentelemetry/semantic-conventions",
    "@opentelemetry/instrumentation",
    "@opentelemetry/instrumentation-http",
    "@opentelemetry/instrumentation-ioredis",
    "@opentelemetry/instrumentation-graphql",
    "@opentelemetry/instrumentation-nestjs-core",
    "@opentelemetry/instrumentation-socket.io",
    "@opentelemetry/exporter-prometheus",
    "@opentelemetry/exporter-zipkin",
    "@opentelemetry/host-metrics"
  ],
  // ── Dates / utils ──
  ["date-fns", "date-fns-tz"],
  ["lodash", "lodash-es", "@types/lodash", "@types/lodash-es", "lodash.throttle"],
  ["uuid", "@types/uuid", "nanoid"],
  ["bcrypt", "bcryptjs", "@types/bcrypt"],
  ["jose", "jsonwebtoken", "@types/jsonwebtoken"],
  ["i18next", "react-i18next"],
  ["@inlang/cli", "@inlang/paraglide-js", "@inlang/plugin-m-function-calls"]
] as const;

/**
 * Mono-product scopes: any package under these scopes may merge into one stack.
 * Never list multi-product orgs here (@tanstack, @types, @aws-sdk multi-service, …).
 */
export const SCOPE_MERGE_ALLOWLIST = new Set([
  // UI kits (one product brand)
  "@heroui",
  "@chakra-ui",
  "@mantine",
  "@headlessui",
  "@radix-ui",
  "@base-ui",
  "@base-ui-components",
  "@shadcn",
  // Editors / AI / RPC / CMS
  "@tiptap",
  "@mastra",
  "@orpc",
  "@payloadcms",
  // Auth / email / CSS / floating / sentry / neon
  "@better-auth",
  "@react-email",
  "@tailwindcss",
  "@floating-ui",
  "@sentry",
  "@neondatabase",
  "@upstash",
  // Drag-and-drop / testing libs that are one product
  "@dnd-kit",
  "@testing-library",
  "@storybook",
  "@vitest",
  "@playwright",
  // Icon / lottie
  "@lottiefiles",
  "@iconify"
]);

/**
 * Look up the family that contains this npm package name (case-insensitive).
 * Returns the family array (preferred primary first) or null.
 */
export function findPackageFamily(npmPackage: string): readonly string[] | null {
  const pkg = npmPackage.toLowerCase();
  for (const family of SAME_PROJECT_PACKAGE_FAMILIES) {
    if (family.some((f) => f.toLowerCase() === pkg)) return family;
  }
  return null;
}
