# Portfolio & Stack Schema Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `stack_alias` with a `stack_dependency` table, use `contact.id` as the portfolio `entityId`, and remove the unused `ai_visibility` field everywhere.

**Architecture:** A new `stack_dependency` table models one-to-many (stack → npm packages). `contact.id` becomes the entity key for the `contact` portfolio type. `portfolio_entry` remains the source of truth for portfolio composition. All `ai_visibility` references are removed.

**Tech Stack:** Drizzle ORM, PostgreSQL, Zod, Mastra workflows, TypeScript

---

## File Structure

### Create

- `packages/db/src/schema/stack-dependency.schema.ts` — new `stack_dependency` table
- `packages/db/src/types/stack-dependency.schema.ts` — TS types
- `packages/db/src/repositories/stack-dependency.repository.ts` — repo (replaces stack-alias repo)
- `packages/db/drizzle/[ts]-add-stack-dependency.ts` — migration (path per drizzle config)

### Modify

- `packages/db/src/schema/stack-alias.schema.ts` — repurpose/rename to stack-dependency (done in code, confirm migration)
- `packages/db/src/types/stack-alias.schema.ts` — rename types to `StackDependency*`
- `packages/db/src/schema/index.ts` — export new table, drop `stackAlias`
- `packages/db/src/types/index.ts` — export new types
- `packages/db/src/repositories/index.ts` — export `stackDependencyRepository`
- `packages/db/src/repositories/stack.repository.ts` — update any alias logic (move/sync)
- `packages/api/src/routers/stacks.router.ts` — use new repo
- `packages/api/src/routers/portfolio.router.ts` — already uses `contact.id` (verify)
- `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts` — use `stack_dependency` for dedup
- Any file referencing `stackAlias` / `ai_visibility` / `contact.type` as entityId

### Delete

- `packages/db/src/repositories/stack-alias.repository.ts` (if separate)
- Old `stack_alias` table in DB (post-migration)

---

## Task 1: `stack_dependency` schema + types + repo

- [ ] **Step 1: Write `stack_dependency` table**

```ts
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { stack } from "#@/schema/stack.schema";

export const stackDependency = pgTable(
  "stack_dependency",
  {
    id: text("id").primaryKey(),
    stackId: text("stack_id")
      .notNull()
      .references(() => stack.id, { onDelete: "cascade" }),
    npmPackage: text("npm_package").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex("stack_dependency_stack_id_npm_package_unique_idx").on(
      table.stackId,
      table.npmPackage
    ),
    index("stack_dependency_stack_id_idx").on(table.stackId)
  ]
);
```

- [ ] **Step 2: Write types** (`StackDependencySchemaInsert/Select`)
- [ ] **Step 3: Write `stackDependencyRepository`** with `findByStackId`, `upsert`, `deleteByStackId`
- [ ] **Step 4: Wire exports** in `schema/index.ts` and `repositories/index.ts`
- [ ] **Step 5: Write/adjust tests** for repo

---

## Task 2: Migration `stack_alias` → `stack_dependency`

- [ ] **Step 1: Generate drizzle migration** that:
  - Creates `stack_dependency`
  - `INSERT INTO stack_dependency (stack_id, npm_package) SELECT stack_id, npm_package FROM stack_alias`
  - Drops `stack_alias`
- [ ] **Step 2: Run migration on dev DB, verify row counts match**

---

## Task 3: `detect-stacks-workflow` dedup via `stack_dependency`

- [ ] **Step 1: Update `deduplicateAndFormat`** step to read `existingDependencies` from `stack_dependency` instead of `existingAliases`
- [ ] **Step 2: Update `InitData` schema** (`DetectStacksWorkflowInputSchema`) to accept deps instead of aliases
- [ ] **Step 3: Update call site passing deps** (where workflow is invoked)

---

## Task 4: `contact.id` as portfolio `entityId`

- [ ] **Step 1: Verify `portfolio.router.ts` uses `contact.id`** (already done at lines 45–51)
- [ ] **Step 2: Remove reliance on `contact.type` as entityId** in `assertEntityExists` contact branch
- [ ] **Step 3: Add/adjust tests** for toggling a contact into portfolio by `id`

---

## Task 5: Remove `ai_visibility`

- [ ] **Step 1: Grep entire repo for `ai_visibility` / `aiVisible`**
- [ ] **Step 2: Remove column from any schema, type, repo, router, workflow**
- [ ] **Step 3: Run typecheck/lint** to confirm zero references remain

---

## Task 6: Verification

- [ ] **Step 1: `pnpm check`** (vp check) — lint + types
- [ ] **Step 2: Run unit tests** (`test:unit:run`)
- [ ] **Step 3: Manual: toggle each entity type into portfolio, confirm `portfolio.list` returns it**
- [ ] **Step 4: Run `detect-stacks-workflow` on a sample repo, confirm no duplicate stacks**
