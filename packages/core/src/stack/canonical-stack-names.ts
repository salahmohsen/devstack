/**
 * Shared canonical product spellings for detect canonicalize + organize rename prompts.
 * Keep in sync with common portfolio stack names; do not invent new products here.
 */
export const CANONICAL_STACK_NAMES_LIST = [
  "React, Vue, Angular, Svelte, Next.js, Nuxt, Remix, Astro, Solid, Preact",
  "Tailwind CSS, Styled Components, Emotion, Framer Motion",
  "Prisma, Drizzle, Mongoose, TypeORM, Sequelize, Knex",
  "Vite, Webpack, esbuild, Rollup, Turbopack",
  "TanStack Query, TanStack Router, TanStack Table, TanStack Form, TanStack Start",
  "Better Auth, NextAuth, Lucia",
  "Vitest, Jest, Playwright, Cypress",
  "Hono, Express, NestJS, Fastify, oRPC, tRPC",
  "Mastra, AI SDK",
  "TypeScript, Node.js, PostgreSQL, Redis, MongoDB",
  "TipTap, Payload CMS, Radix UI, Base UI, HeroUI"
].join("\n");

/** Prompt fragment shared by detect canonicalize-names and organize find-renames. */
export function buildCanonicalRenameRulesBlock(): string {
  return `CANONICAL NAMES (use these exact spellings when applicable):
${CANONICAL_STACK_NAMES_LIST}

RENAME RULES:
- Title case / official brand: "reactjs" → "React", "tailwindcss" → "Tailwind CSS"
- Proper spacing: "framer motion" → "Framer Motion"
- Official short names: "drizzle-orm" → "Drizzle", "prisma client" → "Prisma"
- Keep names that are already canonical
- Do not invent new products; only fix spelling/casing/spacing of known libraries
- NEVER rename a stack to a name that another stack in the list already has — those are merges, not renames
- Do not suggest a rename when the current name is already correct (same spelling/casing)`;
}

/** Short fragment for AI categorize display-name guidance. */
export function buildCanonicalDisplayNamesHint(): string {
  return `CANONICAL DISPLAY NAMES when inventing a new name (use exact spelling):
React, Vue, Angular, Svelte, Next.js, Nuxt, Tailwind CSS, Prisma, Drizzle, Vite,
TanStack Query, TanStack Router, TanStack Form, Better Auth, Vitest, Playwright,
Hono, TypeScript, oRPC, Mastra, TipTap, Radix UI, Payload CMS`;
}
