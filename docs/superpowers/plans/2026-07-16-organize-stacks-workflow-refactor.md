# Organize Stacks Workflow Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 725-line monolithic workflow file into a dedicated folder with individual step files, and eliminate duplicate `OrganizeAction` type declarations in the web app.

**Architecture:** Each workflow step becomes its own `.step.ts` file. Internal Zod schemas live in a dedicated `organize-stacks-workflow.schema.ts`. The `index.ts` orchestrates the step chain. Web app files import `OrganizeAction` from `@tsu-stack/core` instead of redeclaring it locally.

**Tech Stack:** TypeScript, Zod, Mastra workflows, TanStack React Query, oRPC

---

## File Map

| Action | File                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema.ts` |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-merges.step.ts`                |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-renames.step.ts`               |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-enrichments.step.ts`           |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/fetch-missing-icons.step.ts`        |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/sort-stacks.step.ts`                |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/format-output.step.ts`              |
| Create | `apps/agent/src/mastra/workflows/organize-stacks-workflow/index.ts`                           |
| Delete | `apps/agent/src/mastra/workflows/organize-stacks-workflow.ts`                                 |
| Modify | `apps/web/src/pages/dashboard/stacks/ui/organize-dialog.tsx`                                  |
| Modify | `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`                                         |

---

### Task 1: Create schema file

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema.ts`

- [ ] **Step 1: Create the schema file**

Extract the 4 internal schemas from the original workflow file into a dedicated file:

```typescript
import { z } from "zod";

import { OrganizeStacksInputSchema } from "@tsu-stack/core";

export const StackSchema = OrganizeStacksInputSchema.shape.stacks;

export const MergeActionSchema = z.object({
  victimId: z.string(),
  victimName: z.string(),
  survivorId: z.string(),
  survivorName: z.string(),
  reason: z.string()
});

export const RenameActionSchema = z.object({
  stackId: z.string(),
  currentName: z.string(),
  newName: z.string(),
  reason: z.string()
});

export const EnrichActionSchema = z.object({
  stackId: z.string(),
  stackName: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  type: z.string().nullable()
});
```

- [ ] **Step 2: Verify file exists**

```bash
ls apps/agent/src/mastra/workflows/organize-stacks-workflow/
```

Expected: `organize-stacks-workflow.schema.ts` is listed

---

### Task 2: Create find-merges step

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-merges.step.ts`

- [ ] **Step 1: Create the find-merges step file**

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { OrganizeStacksInputSchema } from "@tsu-stack/core";

import { MergeActionSchema, StackSchema } from "./organize-stacks-workflow.schema";

export const findMerges = createStep({
  id: "find-merges",
  description: "Deterministically finds stacks to merge by npm scope and known package families",
  inputSchema: OrganizeStacksInputSchema,
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema)
  }),
  execute: async ({ inputData }) => {
    const { stacks } = inputData;

    if (stacks.length === 0) {
      return { stacks, mergeActions: [] };
    }

    const scopeGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number }>
    >();
    const familyGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number; pkg: string }>
    >();

    const sameProjectGroups = [
      ["react", "react-dom", "@types/react", "@types/react-dom"],
      ["next", "@types/next"],
      [
        "vue",
        "@vue/compiler-sfc",
        "@vue/runtime-dom",
        "@vue/runtime-core",
        "@vue/shared",
        "@types/vue"
      ],
      ["svelte", "@sveltejs/kit", "@sveltejs/vite-plugin-svelte"],
      [
        "@angular/core",
        "@angular/common",
        "@angular/compiler",
        "@angular/platform-browser",
        "@angular/platform-browser-dynamic",
        "@angular/router",
        "@angular/forms",
        "@angular/animations",
        "@angular/cdk"
      ],
      ["prisma", "@prisma/client"],
      ["drizzle-orm", "drizzle-kit", "drizzle-zod", "drizzle-valibot"],
      ["vite", "@vitejs/plugin-react", "@vitejs/plugin-vue", "@vitejs/plugin-svelte"],
      ["typescript", "@types/node"],
      ["eslint", "@typescript-eslint/parser", "@typescript-eslint/eslint-plugin"],
      ["tailwindcss", "postcss", "autoprefixer"],
      ["vitest", "@vitest/ui", "@vitest/coverage-v8"],
      ["jest", "@jest/globals", "ts-jest", "babel-jest"],
      ["@testing-library/react", "@testing-library/jest-dom", "@testing-library/user-event"],
      ["@storybook/react", "@storybook/react-vite"],
      [
        "embla-carousel",
        "embla-carousel-react",
        "embla-carousel-autoplay",
        "embla-carousel-wheel-gestures"
      ],
      ["redux", "react-redux", "@reduxjs/toolkit"],
      ["react-router", "react-router-dom"],
      ["react-hook-form", "@hookform/resolvers"],
      ["zod", "zod-to-json-schema", "zod-validation-error"],
      ["next-auth", "@auth/core", "@auth/prisma-adapter"],
      ["better-auth", "@better-auth/core"],
      ["@trpc/server", "@trpc/client", "@trpc/react-query", "@trpc/next"],
      ["@tanstack/react-query", "@tanstack/react-query-devtools"],
      ["@tanstack/react-router", "@tanstack/router-devtools"],
      ["ai", "@ai-sdk/react", "@ai-sdk/openai", "@ai-sdk/anthropic", "@ai-sdk/google"],
      ["@supabase/supabase-js", "@supabase/auth-helpers-nextjs", "@supabase/ssr"],
      ["firebase", "firebase-admin"],
      ["lucide-react", "lucide-vue-next", "lucide-svelte"],
      ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/modifiers", "@dnd-kit/utilities"],
      ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
      ["@inlang/cli", "@inlang/paraglide-js", "@inlang/plugin-m-function-calls"],
      ["@lottiefiles/dotlottie-react", "@lottiefiles/lottie-player"],
      ["date-fns", "date-fns-tz"],
      ["axios", "axios-retry"],
      ["react-leaflet", "leaflet", "@types/leaflet"],
      ["styled-components", "@types/styled-components"],
      ["@emotion/react", "@emotion/styled"],
      ["lodash", "@types/lodash"],
      ["clsx", "tailwind-merge", "class-variance-authority"],
      ["tailwind-merge", "tailwind-variants"],
      ["webpack", "webpack-cli", "webpack-dev-server"],
      [
        "rollup",
        "@rollup/plugin-commonjs",
        "@rollup/plugin-node-resolve",
        "@rollup/plugin-typescript"
      ],
      ["playwright", "@playwright/test"],
      ["@grpc/grpc-js", "@grpc/proto-loader"],
      ["socket.io", "socket.io-client"],
      ["ws", "@types/ws"]
    ];

    for (const stack of stacks) {
      const pkg = stack.name.toLowerCase().replace(/\s+/g, "");
      if (pkg.startsWith("@")) {
        const scope = pkg.split("/")[0];
        if (scope) {
          if (!scopeGroups.has(scope)) scopeGroups.set(scope, []);
          scopeGroups.get(scope)!.push({
            id: stack.id,
            name: stack.name,
            projectCount: stack.projectCount
          });
        }
      }

      for (const family of sameProjectGroups) {
        if (
          family.some(
            (f) => f.toLowerCase() === pkg || f.toLowerCase() === stack.name.toLowerCase()
          )
        ) {
          if (!familyGroups.has(family.join(","))) {
            familyGroups.set(family.join(","), []);
          }
          familyGroups.get(family.join(","))!.push({
            id: stack.id,
            name: stack.name,
            projectCount: stack.projectCount,
            pkg
          });
          break;
        }
      }
    }

    const mergeActions: z.infer<typeof MergeActionSchema>[] = [];
    const usedAsVictim = new Set<string>();

    function addMerges(
      group: Array<{ id: string; name: string; projectCount: number }>,
      reason: string
    ) {
      if (group.length < 2) return;

      const sorted = [...group].toSorted(
        (
          a: { id: string; name: string; projectCount: number },
          b: { id: string; name: string; projectCount: number }
        ) => {
          const diff = b.projectCount - a.projectCount;
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }
      );

      const survivor = sorted[0];
      if (!survivor) return;

      for (let i = 1; i < sorted.length; i++) {
        const victim = sorted[i];
        if (!victim) continue;
        if (usedAsVictim.has(victim.id)) continue;
        if (victim.id === survivor.id) continue;
        usedAsVictim.add(victim.id);
        mergeActions.push({
          victimId: victim.id,
          victimName: victim.name,
          survivorId: survivor.id,
          survivorName: survivor.name,
          reason
        });
      }
    }

    for (const [scope, group] of scopeGroups) {
      addMerges(group, `All ${scope}/* packages are the same library`);
    }

    for (const [family, group] of familyGroups) {
      addMerges(group, `Same project: ${family}`);
    }

    return { stacks, mergeActions };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/organize-stacks-workflow/find-merges.step.ts apps/agent/src/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema.ts
git commit -m "refactor: extract organize-stacks schemas and find-merges step into folder"
```

---

### Task 3: Create find-renames step

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-renames.step.ts`

- [ ] **Step 1: Create the find-renames step file**

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "./organize-stacks-workflow.schema";

export const findRenames = createStep({
  id: "find-renames",
  description: "Uses LLM to identify stacks needing name standardization",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema)
  }),
  execute: async ({ inputData, mastra, abortSignal }) => {
    if (abortSignal?.aborted) {
      return { stacks: inputData.stacks, mergeActions: inputData.mergeActions, renameActions: [] };
    }
    const { stacks, mergeActions } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const candidates = stacks.filter((s) => !victimIds.has(s.id));

    if (candidates.length === 0) {
      return { stacks, mergeActions, renameActions: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return { stacks, mergeActions, renameActions: [] };
    }

    const CHUNK_SIZE = 25;
    const renameActions: z.infer<typeof RenameActionSchema>[] = [];
    const usedNewNames = new Set<string>();
    const usedStackIds = new Set<string>();

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + CHUNK_SIZE);
      const stackList = chunk.map((s) => `- id: ${s.id} | name: "${s.name}"`).join("\n");

      const prompt = `Identify stacks with inconsistent or non-canonical names.

Stacks:
${stackList}

CANONICAL NAMES (use these exact spellings):
React, Vue, Angular, Svelte, Next.js, Nuxt, Remix, Astro, Solid, Preact
Tailwind CSS, Styled Components, Emotion, Framer Motion
Prisma, Drizzle, Mongoose, TypeORM, Sequelize, Knex
Vite, Webpack, esbuild, Rollup, Turbopack
TanStack Query, TanStack Router, TanStack Table
Better Auth, NextAuth, Lucia
Vitest, Jest, Playwright, Cypress

RENAME RULES:
- Title case: "reactjs" → "React", "tailwindcss" → "Tailwind CSS"
- Proper spacing: "framer motion" → "Framer Motion"
- Official names: "drizzle-orm" → "Drizzle", "prisma client" → "Prisma"
- Keep existing canonical names unchanged

Output JSON:
{
  "renames": [
    {
      "stackId": "id",
      "currentName": "current",
      "newName": "canonical",
      "reason": "why rename"
    }
  ]
}

Only suggest renames when the current name is clearly non-canonical. Skip stacks that already have correct names.`;

      try {
        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: {
              schema: z.object({
                renames: z.array(RenameActionSchema).default([])
              })
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM timeout after 60s")), 60_000)
          )
        ]);

        for (const rename of result.object.renames ?? []) {
          const stack = chunk.find((s) => s.id === rename.stackId);
          if (!stack) continue;
          if (stack.name === rename.newName) continue;
          if (usedStackIds.has(rename.stackId)) continue;
          if (usedNewNames.has(rename.newName.toLowerCase())) continue;
          usedStackIds.add(rename.stackId);
          usedNewNames.add(rename.newName.toLowerCase());
          renameActions.push({
            stackId: rename.stackId,
            currentName: stack.name,
            newName: rename.newName,
            reason: rename.reason
          });
        }
      } catch (error) {
        console.error("[organize-stacks] Rename analysis failed for chunk:", error);
      }
    }

    return { stacks, mergeActions, renameActions };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/organize-stacks-workflow/find-renames.step.ts
git commit -m "refactor: extract find-renames step into folder"
```

---

### Task 4: Create find-enrichments step

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-enrichments.step.ts`

- [ ] **Step 1: Create the find-enrichments step file**

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { resolveIconForPackage } from "@tsu-stack/core";

import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "./organize-stacks-workflow.schema";

export const findEnrichments = createStep({
  id: "find-enrichments",
  description: "Uses LLM to identify stacks missing descriptions, icons, or types",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema)
  }),
  execute: async ({ inputData, mastra, abortSignal }) => {
    if (abortSignal?.aborted) {
      return {
        stacks: inputData.stacks,
        mergeActions: inputData.mergeActions,
        renameActions: inputData.renameActions,
        enrichActions: []
      };
    }
    const { stacks, mergeActions, renameActions } = inputData;

    const skipIds = new Set([
      ...mergeActions.map((m) => m.victimId),
      ...renameActions.map((r) => r.stackId)
    ]);

    const candidates = stacks.filter(
      (s) => !skipIds.has(s.id) && (!s.description || !s.icon || !s.type || s.type === "other")
    );

    if (candidates.length === 0) {
      return { stacks, mergeActions, renameActions, enrichActions: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return { stacks, mergeActions, renameActions, enrichActions: [] };
    }

    const CHUNK_SIZE = 20;
    const enrichActions: z.infer<typeof EnrichActionSchema>[] = [];

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + CHUNK_SIZE);
      const stackList = chunk
        .map(
          (s) =>
            `- id: ${s.id} | "${s.name}" | type: ${s.type ?? "none"} | desc: ${s.description ?? "none"} | icon: ${s.icon ?? "none"}`
        )
        .join("\n");

      const prompt = `Suggest enrichments for stacks with missing metadata.

Stacks:
${stackList}

For each stack, suggest:
1. description: one-sentence description (if missing)
2. icon: a short search query to find an Iconify icon, e.g. "react", "tailwind css", "prisma" (if missing)
3. type: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | other (if missing or "other")

TYPE GUIDELINES:
- Framework: React, Vue, Angular, Next.js, Nuxt, Remix, Astro, Svelte, Hono, Express
- UI: Tailwind CSS, Radix UI, shadcn/ui, HeroUI, Base UI, Chakra UI, Material UI
- Database: Prisma, Drizzle, Mongoose, TypeORM, Sequelize
- Tooling: Vite, Webpack, ESLint, Prettier, TypeScript
- Testing: Vitest, Jest, Playwright, Cypress
- AI: OpenAI, Anthropic, LangChain, AI SDK, Mastra
- Auth: Better Auth, NextAuth, Lucia
- Deployment: Vercel, Netlify, Cloudflare Workers, Firebase

Output JSON:
{
  "enrichments": [
    {
      "stackId": "id",
      "stackName": "name",
      "description": "new description or null",
      "icon": "search query or null",
      "type": "correct type or null"
    }
  ]
}

Only suggest changes when metadata is clearly missing or wrong. Skip stacks with complete metadata.`;

      try {
        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: {
              schema: z.object({
                enrichments: z.array(EnrichActionSchema).default([])
              })
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM timeout after 60s")), 60_000)
          )
        ]);

        for (const enrich of result.object.enrichments ?? []) {
          const stack = chunk.find((s) => s.id === enrich.stackId);
          if (!stack) continue;

          const descChanged = enrich.description && enrich.description !== stack.description;
          const iconChanged = enrich.icon && enrich.icon !== stack.icon;
          const typeChanged = enrich.type && enrich.type !== stack.type && enrich.type !== "other";

          if (descChanged || iconChanged || typeChanged) {
            let iconSvg: string | null = null;
            if (iconChanged && enrich.icon) {
              iconSvg = await resolveIconForPackage(enrich.icon);
            }
            enrichActions.push({
              stackId: enrich.stackId,
              stackName: stack.name,
              description: descChanged ? enrich.description : null,
              icon: iconSvg,
              type: typeChanged ? enrich.type : null
            });
          }
        }
      } catch (error) {
        console.error("[organize-stacks] Enrichment analysis failed for chunk:", error);
      }
    }

    return { stacks, mergeActions, renameActions, enrichActions };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/organize-stacks-workflow/find-enrichments.step.ts
git commit -m "refactor: extract find-enrichments step into folder"
```

---

### Task 5: Create fetch-missing-icons step

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/fetch-missing-icons.step.ts`

- [ ] **Step 1: Create the fetch-missing-icons step file**

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { resolveIconForPackage } from "@tsu-stack/core";

import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "./organize-stacks-workflow.schema";

export const fetchMissingIcons = createStep({
  id: "fetch-missing-icons",
  description: "Fetches Iconify SVG icons for stacks that still lack one",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema)
  }),
  execute: async ({ inputData }) => {
    const { stacks, mergeActions, renameActions, enrichActions } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const enrichedIds = new Set(enrichActions.filter((e) => e.icon).map((e) => e.stackId));

    const missing = stacks.filter((s) => !victimIds.has(s.id) && !s.icon && !enrichedIds.has(s.id));

    if (missing.length === 0) {
      return { stacks, mergeActions, renameActions, enrichActions };
    }

    const results = await Promise.allSettled(
      missing.map(async (s) => {
        const svg = await resolveIconForPackage(s.name);
        return { stackId: s.id, stackName: s.name, svg };
      })
    );

    const newEnrichActions = [...enrichActions];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.svg) {
        newEnrichActions.push({
          stackId: result.value.stackId,
          stackName: result.value.stackName,
          description: null,
          icon: result.value.svg,
          type: null
        });
      }
    }

    return { stacks, mergeActions, renameActions, enrichActions: newEnrichActions };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/organize-stacks-workflow/fetch-missing-icons.step.ts
git commit -m "refactor: extract fetch-missing-icons step into folder"
```

---

### Task 6: Create sort-stacks step

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/sort-stacks.step.ts`

- [ ] **Step 1: Create the sort-stacks step file**

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "./organize-stacks-workflow.schema";

export const sortStacks = createStep({
  id: "sort-stacks",
  description: "Uses LLM to sort stacks by importance and foundational role",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    sortOrder: z.array(z.string())
  }),
  execute: async ({ inputData, mastra, abortSignal }) => {
    if (abortSignal?.aborted) {
      return { ...inputData, sortOrder: inputData.stacks.map((s) => s.id) };
    }
    const { stacks, mergeActions, renameActions, enrichActions } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const remaining = stacks.filter((s) => !victimIds.has(s.id));

    if (remaining.length === 0) {
      return { stacks, mergeActions, renameActions, enrichActions, sortOrder: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder: remaining.map((s) => s.id)
      };
    }

    const stackList = remaining
      .map((s) => `- id: ${s.id} | "${s.name}" | type: ${s.type} | projects: ${s.projectCount}`)
      .join("\n");

    const prompt = `Sort these tech stacks by importance and foundational role. Most foundational/important first.

Stacks:
${stackList}

SORTING RULES:
- Languages first: TypeScript, JavaScript, Python, Go, Rust, etc.
- Core frameworks next: React, Vue, Angular, Next.js, Nuxt, Svelte, etc.
- Build tools: Vite, Webpack, esbuild, etc.
- CSS/Styling: Tailwind CSS, Styled Components, etc.
- State management: Zustand, Jotai, Redux, etc.
- Data fetching: TanStack Query, SWR, etc.
- Databases/ORMs: Prisma, Drizzle, PostgreSQL, etc.
- Auth: Better Auth, NextAuth, etc.
- Testing: Vitest, Jest, Playwright, etc.
- Deployment: Vercel, Cloudflare, Docker, etc.
- Dev tools: ESLint, Prettier, TypeScript, etc.
- UI component libraries: Radix UI, HeroUI, etc.
- Utilities last: clsx, zod, lodash, etc.

Within each category, sort by project count (more projects = more important).

Output JSON:
{
  "orderedIds": ["id1", "id2", ...]
}

Return ALL remaining stack IDs in order.`;

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: {
            schema: z.object({
              orderedIds: z.array(z.string())
            })
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LLM timeout after 60s")), 60_000)
        )
      ]);

      const remainingIds = new Set(remaining.map((s) => s.id));
      const validOrder = (result.object.orderedIds ?? []).filter((id) => remainingIds.has(id));

      for (const s of remaining) {
        if (!validOrder.includes(s.id)) validOrder.push(s.id);
      }

      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder: validOrder
      };
    } catch (error) {
      console.error("[organize-stacks] Sort analysis failed:", error);
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder: remaining.map((s) => s.id)
      };
    }
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/organize-stacks-workflow/sort-stacks.step.ts
git commit -m "refactor: extract sort-stacks step into folder"
```

---

### Task 7: Create format-output step

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/format-output.step.ts`

- [ ] **Step 1: Create the format-output step file**

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { OrganizeStacksOutputSchema, type OrganizeAction } from "@tsu-stack/core";

import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "./organize-stacks-workflow.schema";

export const formatOutput = createStep({
  id: "format-output",
  description: "Combines all actions into final output with summary",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    sortOrder: z.array(z.string())
  }),
  outputSchema: OrganizeStacksOutputSchema,
  execute: async ({ inputData }) => {
    const { mergeActions, renameActions, enrichActions, sortOrder } = inputData;
    const actions: OrganizeAction[] = [];

    for (const m of mergeActions) {
      actions.push({
        type: "merge",
        stackId: m.victimId,
        stackName: m.victimName,
        details: { mergeIntoId: m.survivorId, mergeIntoName: m.survivorName },
        reason: m.reason
      });
    }

    for (const r of renameActions) {
      actions.push({
        type: "rename",
        stackId: r.stackId,
        stackName: r.currentName,
        details: { newName: r.newName },
        reason: r.reason
      });
    }

    for (const e of enrichActions) {
      actions.push({
        type: "enrich",
        stackId: e.stackId,
        stackName: e.stackName,
        details: {
          newDescription: e.description ?? undefined,
          newIcon: e.icon ?? undefined,
          newType: e.type ?? undefined
        },
        reason: `Enrich metadata for "${e.stackName}"`
      });
    }

    return {
      actions,
      sortOrder,
      summary: {
        merges: mergeActions.length,
        renames: renameActions.length,
        enrichments: enrichActions.length,
        sorted: sortOrder.length > 0
      }
    };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/organize-stacks-workflow/format-output.step.ts
git commit -m "refactor: extract format-output step into folder"
```

---

### Task 8: Create index.ts and delete old file

**Files:**

- Create: `apps/agent/src/mastra/workflows/organize-stacks-workflow/index.ts`
- Delete: `apps/agent/src/mastra/workflows/organize-stacks-workflow.ts`

- [ ] **Step 1: Create the index.ts orchestrator**

```typescript
import { createWorkflow } from "@mastra/core/workflows";

import { OrganizeStacksInputSchema, OrganizeStacksOutputSchema } from "@tsu-stack/core";

import { fetchMissingIcons } from "./fetch-missing-icons.step";
import { findEnrichments } from "./find-enrichments.step";
import { findMerges } from "./find-merges.step";
import { findRenames } from "./find-renames.step";
import { formatOutput } from "./format-output.step";
import { sortStacks } from "./sort-stacks.step";

export const organizeStacksWorkflow = createWorkflow({
  id: "organize-stacks-workflow",
  inputSchema: OrganizeStacksInputSchema,
  outputSchema: OrganizeStacksOutputSchema
})
  .then(findMerges)
  .then(findRenames)
  .then(findEnrichments)
  .then(fetchMissingIcons)
  .then(sortStacks)
  .then(formatOutput);

organizeStacksWorkflow.commit();
```

- [ ] **Step 2: Delete the old flat file**

```bash
rm apps/agent/src/mastra/workflows/organize-stacks-workflow.ts
```

- [ ] **Step 3: Verify import resolution in mastra/index.ts**

The import in `apps/agent/src/mastra/index.ts` stays the same:

```typescript
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
```

Vite resolves this to the folder's `index.ts`. No change needed.

- [ ] **Step 4: Commit**

```bash
git add apps/agent/src/mastra/workflows/organize-stacks-workflow/index.ts apps/agent/src/mastra/workflows/organize-stacks-workflow.ts
git commit -m "refactor: replace flat workflow file with folder-based structure"
```

---

### Task 9: Fix web app type duplication

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/ui/organize-dialog.tsx`
- Modify: `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`

- [ ] **Step 1: Fix organize-dialog.tsx**

Replace the local `OrganizeAction` type (lines 28-34) with an import from core. The existing `OrganizeDialogProps` on line 36 already references `OrganizeAction[]`, so this is a drop-in replacement.

```diff
- type OrganizeAction = {
-   type: string;
-   stackId: string;
-   stackName: string;
-   details: Record<string, unknown>;
-   reason: string;
- };
+ import { type OrganizeAction } from "@tsu-stack/core";
```

The import goes at the top of the file with the other imports (after the `@tsu-stack/ui` imports, before the `@/shared/ui` import).

- [ ] **Step 2: Fix stacks-page.tsx**

Replace the inline type for `organizeActions` state (lines 79-87) with `OrganizeAction[]`.

```diff
- import { type StackOutput } from "@tsu-stack/core";
+ import { type OrganizeAction, type StackOutput } from "@tsu-stack/core";
```

Then change the state declaration:

```diff
- const [organizeActions, setOrganizeActions] = useState<
-   Array<{
-     type: string;
-     stackId: string;
-     stackName: string;
-     details: Record<string, unknown>;
-     reason: string;
-   }>
- >([]);
+ const [organizeActions, setOrganizeActions] = useState<OrganizeAction[]>([]);
```

- [ ] **Step 3: Verify builds pass**

```bash
pnpm -C apps/agent build
pnpm -C apps/web build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/stacks/ui/organize-dialog.tsx apps/web/src/pages/dashboard/stacks/stacks-page.tsx
git commit -m "fix: deduplicate OrganizeAction type in web app, use core types"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full typecheck**

```bash
pnpm typecheck
```

Expected: No errors

- [ ] **Step 2: Verify old file deleted**

```bash
ls apps/agent/src/mastra/workflows/organize-stacks-workflow.ts 2>&1
```

Expected: "No such file or directory"

- [ ] **Step 3: Verify folder structure**

```bash
ls apps/agent/src/mastra/workflows/organize-stacks-workflow/
```

Expected: 8 files — `index.ts`, `organize-stacks-workflow.schema.ts`, 6 `*.step.ts` files

- [ ] **Step 4: Verify no remaining duplicate types**

```bash
rg "type OrganizeAction" apps/web/
```

Expected: No results (all imports now come from core)
