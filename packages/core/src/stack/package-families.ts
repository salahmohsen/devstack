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
  // Keep next-themes / next-intl OUT of this family — they appear without Next.js
  // (e.g. TanStack Start + next-themes) and must not become a "Next.js" stack.
  ["next", "eslint-config-next", "@next/eslint-plugin-next", "@types/next"],
  ["next-themes"],
  ["next-intl"],
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
  ["@tanstack/react-table", "@tanstack/match-sorter-utils", "@tanstack/table-core"],
  [
    "@tanstack/react-start",
    "@tanstack/start-client",
    "@tanstack/start-server",
    "@tanstack/start-plugin-core",
    "@tanstack/react-start-server",
    "@tanstack/react-start-client",
    "@tanstack/nitro-v2-vite-plugin"
  ],
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
  ["firebase", "firebase-admin", "@firebase/app", "@firebase/auth", "@firebase/firestore"],
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
  ["@inlang/cli", "@inlang/paraglide-js", "@inlang/plugin-m-function-calls"],
  // ── Common app libraries (often left as low-confidence noise) ──
  ["zustand"],
  ["recharts"],
  ["sonner", "react-hot-toast"],
  ["cmdk"],
  ["nuqs"],
  ["husky", "lint-staged"],
  ["sass", "sass-embedded"],
  ["resend"],
  ["bullmq", "bull"],
  ["octokit", "@octokit/rest", "@octokit/core", "@octokit/graphql"],
  ["sharp"],
  ["nitro", "nitropack"]
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

/**
 * Canonical portfolio display names keyed by family primary package (lowercase).
 * Used by detect fallbacks / merge so TanStack products stay separate with correct labels
 * even when the LLM soft-fails.
 */
const FAMILY_PRIMARY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  react: "React",
  next: "Next.js",
  "next-themes": "next-themes",
  "next-intl": "next-intl",
  vue: "Vue",
  svelte: "Svelte",
  "solid-js": "Solid",
  preact: "Preact",
  lit: "Lit",
  "@angular/core": "Angular",
  prisma: "Prisma",
  "drizzle-orm": "Drizzle",
  pg: "PostgreSQL",
  vite: "Vite",
  webpack: "Webpack",
  rollup: "Rollup",
  wrangler: "Cloudflare Workers",
  eslint: "ESLint",
  prettier: "Prettier",
  oxlint: "Oxlint",
  vitest: "Vitest",
  jest: "Jest",
  "@testing-library/react": "Testing Library",
  playwright: "Playwright",
  storybook: "Storybook",
  "@tanstack/react-query": "TanStack Query",
  "@tanstack/react-router": "TanStack Router",
  "@tanstack/react-form": "TanStack Form",
  "@tanstack/react-table": "TanStack Table",
  "@tanstack/react-start": "TanStack Start",
  "@tanstack/react-store": "TanStack Store",
  "@tanstack/db": "TanStack DB",
  "@tanstack/react-devtools": "TanStack Devtools",
  "better-auth": "Better Auth",
  "next-auth": "NextAuth",
  "@orpc/server": "oRPC",
  "@trpc/server": "tRPC",
  hono: "Hono",
  express: "Express",
  ai: "AI SDK",
  mastra: "Mastra",
  tailwindcss: "Tailwind CSS",
  postcss: "PostCSS",
  motion: "Motion",
  "styled-components": "Styled Components",
  "@emotion/react": "Emotion",
  "radix-ui": "Radix UI",
  "@base-ui/react": "Base UI",
  shadcn: "shadcn/ui",
  "class-variance-authority": "CVA",
  "react-aria-components": "React Aria",
  "@floating-ui/dom": "Floating UI",
  "@dnd-kit/core": "dnd kit",
  "lucide-react": "Lucide",
  "react-hook-form": "React Hook Form",
  zod: "Zod",
  redux: "Redux",
  "react-router": "React Router",
  "@tiptap/react": "TipTap",
  yjs: "Yjs",
  shiki: "Shiki",
  payload: "Payload CMS",
  axios: "Axios",
  "socket.io": "Socket.IO",
  ioredis: "Redis",
  firebase: "Firebase",
  "@supabase/supabase-js": "Supabase",
  "@aws-sdk/client-s3": "AWS S3",
  "react-email": "React Email",
  "@sentry/react": "Sentry",
  "@opentelemetry/api": "OpenTelemetry",
  "date-fns": "date-fns",
  lodash: "Lodash",
  uuid: "uuid",
  jose: "Jose",
  i18next: "i18next",
  zustand: "Zustand",
  recharts: "Recharts",
  sonner: "Sonner",
  cmdk: "cmdk",
  nuqs: "nuqs",
  husky: "Husky",
  sass: "Sass",
  resend: "Resend",
  bullmq: "BullMQ",
  octokit: "Octokit",
  sharp: "Sharp",
  nitro: "Nitro"
};

/** Default stack type for a family primary (lowercase key). */
const FAMILY_PRIMARY_TYPES: Readonly<Record<string, string>> = {
  react: "framework",
  next: "framework",
  "next-themes": "ui",
  "next-intl": "tooling",
  vue: "framework",
  svelte: "framework",
  "solid-js": "framework",
  preact: "framework",
  lit: "framework",
  "@angular/core": "framework",
  prisma: "database",
  "drizzle-orm": "database",
  pg: "database",
  vite: "tooling",
  webpack: "tooling",
  rollup: "tooling",
  wrangler: "deployment",
  eslint: "tooling",
  prettier: "tooling",
  oxlint: "tooling",
  vitest: "testing",
  jest: "testing",
  "@testing-library/react": "testing",
  playwright: "testing",
  storybook: "testing",
  "@tanstack/react-query": "framework",
  "@tanstack/react-router": "framework",
  "@tanstack/react-form": "framework",
  "@tanstack/react-table": "ui",
  "@tanstack/react-start": "framework",
  "@tanstack/react-store": "state management",
  "@tanstack/db": "database",
  "@tanstack/react-devtools": "tooling",
  "better-auth": "auth",
  "next-auth": "auth",
  "@orpc/server": "framework",
  "@trpc/server": "framework",
  hono: "framework",
  express: "framework",
  ai: "ai",
  mastra: "ai",
  tailwindcss: "ui",
  postcss: "tooling",
  motion: "ui",
  "styled-components": "ui",
  "@emotion/react": "ui",
  "radix-ui": "ui",
  "@base-ui/react": "ui",
  shadcn: "ui",
  "class-variance-authority": "ui",
  "react-aria-components": "ui",
  "@floating-ui/dom": "ui",
  "@dnd-kit/core": "ui",
  "lucide-react": "ui",
  "react-hook-form": "ui",
  zod: "tooling",
  redux: "state management",
  "react-router": "framework",
  "@tiptap/react": "ui",
  yjs: "storage",
  shiki: "ui",
  payload: "framework",
  axios: "tooling",
  "socket.io": "framework",
  ioredis: "database",
  firebase: "storage",
  "@supabase/supabase-js": "database",
  "@aws-sdk/client-s3": "storage",
  "react-email": "ui",
  "@sentry/react": "tooling",
  "@opentelemetry/api": "tooling",
  "date-fns": "tooling",
  lodash: "tooling",
  uuid: "tooling",
  jose: "auth",
  i18next: "tooling",
  zustand: "state management",
  recharts: "ui",
  sonner: "ui",
  cmdk: "ui",
  nuqs: "tooling",
  husky: "tooling",
  sass: "ui",
  resend: "tooling",
  bullmq: "tooling",
  octokit: "tooling",
  sharp: "tooling",
  nitro: "deployment"
};

/**
 * Canonical display name for a known family package, or null if not in a family
 * with a curated label.
 */
export function getPackageFamilyDisplayName(npmPackage: string): string | null {
  const family = findPackageFamily(npmPackage);
  if (!family?.[0]) return null;
  return FAMILY_PRIMARY_DISPLAY_NAMES[family[0].toLowerCase()] ?? null;
}

/**
 * Default stack type for a known family package, or null when unknown.
 */
export function getPackageFamilyType(npmPackage: string): string | null {
  const family = findPackageFamily(npmPackage);
  if (!family?.[0]) return null;
  return FAMILY_PRIMARY_TYPES[family[0].toLowerCase()] ?? null;
}

/**
 * Preferred primary package for icon search (family head when known).
 */
export function getPackageFamilyPrimary(npmPackage: string): string | null {
  const family = findPackageFamily(npmPackage);
  return family?.[0] ?? null;
}

/**
 * Canonical names that must only be used when the npm package is in that product family.
 * Prevents `@zappicon/react` → "React" and similar false brand collisions.
 */
const RESERVED_DISPLAY_NAMES: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const [primary, name] of Object.entries(FAMILY_PRIMARY_DISPLAY_NAMES)) {
    map[name.trim().toLowerCase()] = primary;
  }
  // Extra short forms that models invent
  map.react = "react";
  map.next = "next";
  map.nextjs = "next";
  map.vue = "vue";
  map.vite = "vite";
  map.drizzle = "drizzle-orm";
  map.prisma = "prisma";
  map.tiptap = "@tiptap/react";
  map.mastra = "mastra";
  map.orpc = "@orpc/server";
  map.trpc = "@trpc/server";
  map.hono = "hono";
  return map;
})();

/** Title-case a package segment: "react-query" → "React Query". */
function titleCaseSegment(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Humanize an npm package name for portfolio display when no curated label exists.
 * Scoped packages keep the product brand, not only the last segment (`@zappicon/react`
 * → "Zappicon", not "React").
 */
export function humanizeNpmPackageName(npmPackage: string): string {
  const curated = getPackageFamilyDisplayName(npmPackage);
  if (curated) return curated;

  const raw = npmPackage.trim();
  if (!raw) return raw;

  if (raw.startsWith("@")) {
    const [scopePart, namePart] = raw.slice(1).split("/");
    const scope = (scopePart ?? "").trim();
    const name = (namePart ?? "").trim();
    // Mono-product scopes that are the product brand
    if (scope && (!name || name === "core" || name === "react" || name === "js" || name === "ts")) {
      return titleCaseSegment(scope);
    }
    if (scope && name) {
      // Prefer "Scope Name" when last segment is a framework adapter (react/vue/next/…)
      if (/^(react|vue|svelte|angular|solid|next|nuxt|node|web|cli|core|js|ts)$/i.test(name)) {
        return titleCaseSegment(scope);
      }
      return `${titleCaseSegment(scope)} ${titleCaseSegment(name)}`.trim();
    }
    return titleCaseSegment(scope || raw);
  }

  return titleCaseSegment(raw);
}

/**
 * Ensure a proposed display name is safe for this package.
 * - Curated family packages always get the curated label.
 * - Reserved brand names (React, Next.js, …) only apply to their family packages.
 */
export function resolveSafeDisplayName(npmPackage: string, proposedName?: string | null): string {
  const curated = getPackageFamilyDisplayName(npmPackage);
  if (curated) return curated;

  const proposed = (proposedName ?? "").trim();
  if (!proposed) return humanizeNpmPackageName(npmPackage);

  const reservedPrimary = RESERVED_DISPLAY_NAMES[proposed.toLowerCase()];
  if (reservedPrimary) {
    const family = findPackageFamily(npmPackage);
    const primary = family?.[0]?.toLowerCase();
    if (primary !== reservedPrimary.toLowerCase()) {
      return humanizeNpmPackageName(npmPackage);
    }
  }

  return proposed;
}
