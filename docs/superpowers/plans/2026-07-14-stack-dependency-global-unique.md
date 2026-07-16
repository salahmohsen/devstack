# Stack Dependency Global Unique Constraint Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `stack_dependency` so `npm_package` is globally unique (one package = one stack), and the detection workflow absorbs duplicate packages into existing stacks instead of creating conflicts.

**Architecture:** The original design had a unique index on `npm_package` alone. A bad migration (20260714000000) changed it to a composite unique on `(stack_id, npm_package)`, allowing the same package under multiple stacks. This plan reverts the schema, fixes the repository upsert target, and adds a post-categorization dedup step in the detection workflow so groups that overlap with existing stacks absorb into the owning stack.

**Tech Stack:** Drizzle ORM, PostgreSQL (Neon), Mastra workflows, oRPC

---

## Context

**Entity model:**

```
project —M:N—> stack —1:N—> stack_dependency (npm_package globally unique)
```

- Each `stack_dependency` row owns exactly one npm package. That package cannot belong to any other stack.
- `findByNpmPackageAlias` looks up by `npmPackage` alone (assumes global uniqueness).
- `stackRepository.merge` / `batchMerge` reassigns or deletes duplicate dependencies when merging stacks — this logic is already correct for global uniqueness.

**The bug:** My migration `20260714000000_stack_dependency_composite_unique` changed the constraint to `(stack_id, npm_package)`. The `upsert` repository method targets `[stackId, npmPackage]` and the raw SQL in `upsertFromDetection` uses `ON CONFLICT ("stack_id","npm_package") DO NOTHING`. Both are wrong for the intended model.

**Edge case the detection workflow must handle:**
If the AI categorizer groups packages `[A, B, C]` into a new stack, but package `A` already belongs to an existing stack `X`, then ALL three packages (`A`, `B`, `C`) must be absorbed into stack `X`. No new stack is created. The DB constraint is the safety net; the workflow is the root fix.

---

## File Structure

| File                                                                                        | Role                                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/db/src/schema/stack-dependency.schema.ts`                                         | Schema: revert to unique on `npm_package` alone              |
| `packages/db/src/repositories/stack-dependency.repository.ts`                               | Repository: fix upsert target to `npm_package`               |
| `packages/db/migrations/20260714000000_stack_dependency_composite_unique/migration.sql`     | Remove bad migration                                         |
| `packages/db/migrations/20260714120000_revert_stack_dependency_global_unique/migration.sql` | New migration: drop composite unique, recreate global unique |
| `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts`                                 | Workflow: add dedup step after `ai-categorize`               |
| `packages/api/src/routers/stacks.router.ts`                                                 | RPC: fix `upsertFromDetection` to handle conflicts           |

---

## Task 1: Revert schema to global unique on `npm_package`

**Files:**

- Modify: `packages/db/src/schema/stack-dependency.schema.ts:24-26`

- [ ] **Step 1: Revert the unique index in schema**

Change:

```typescript
uniqueIndex("stack_dependency_stack_id_npm_package_unique_idx").on(table.stackId, table.npmPackage),
```

To:

```typescript
uniqueIndex("stack_dependency_npm_package_unique_idx").on(table.npmPackage),
```

- [ ] **Step 2: Verify the schema compiles**

Run: `pnpm typecheck` from workspace root.
Expected: PASS (no type errors in schema file)

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/stack-dependency.schema.ts
git commit -m "fix(db): revert stack_dependency to global unique on npm_package"
```

---

## Task 2: Remove bad migration and create correct one

**Files:**

- Delete: `packages/db/migrations/20260714000000_stack_dependency_composite_unique/migration.sql` (and directory)
- Create: `packages/db/migrations/20260714120000_revert_stack_dependency_global_unique/migration.sql`

- [ ] **Step 1: Delete the bad migration directory**

```bash
rm -rf packages/db/migrations/20260714000000_stack_dependency_composite_unique
```

- [ ] **Step 2: Create new migration SQL**

Create `packages/db/migrations/20260714120000_revert_stack_dependency_global_unique/migration.sql`:

```sql
DROP INDEX IF EXISTS "stack_dependency_stack_id_npm_package_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "stack_dependency_npm_package_unique_idx" ON "stack_dependency" ("npm_package");
```

- [ ] **Step 3: Apply migration to database**

Run from `packages/db`:

```bash
set -a && source ../env/.env && set +a
```

Then execute the SQL directly using a Neon HTTP script (same pattern as the original bad migration fix):

```typescript
// packages/db/migrate-revert.ts
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
await sql`DROP INDEX IF EXISTS stack_dependency_stack_id_npm_package_unique_idx`;
await sql`CREATE UNIQUE INDEX stack_dependency_npm_package_unique_idx ON stack_dependency (npm_package)`;
console.log("Migration applied: reverted to global unique on npm_package");
```

Run: `set -a && source ../env/.env && set +a && vpx tsx packages/db/migrate-revert.ts`
Clean up: `rm packages/db/migrate-revert.ts`

- [ ] **Step 4: Commit**

```bash
git add packages/db/migrations/
git commit -m "fix(db): migration to revert stack_dependency to global unique on npm_package"
```

---

## Task 3: Fix repository upsert to target `npm_package` alone

**Files:**

- Modify: `packages/db/src/repositories/stack-dependency.repository.ts:19-29`

- [ ] **Step 1: Fix the onConflictDoNothing target**

Change:

```typescript
.onConflictDoNothing({
  target: [stackDependency.stackId, stackDependency.npmPackage]
});
```

To:

```typescript
.onConflictDoNothing({
  target: stackDependency.npmPackage
});
```

- [ ] **Step 2: Fix the find query after upsert**

Change:

```typescript
return getDb().query.stackDependency.findFirst({
  where: { stackId: input.stackId, npmPackage: input.npmPackage }
});
```

To:

```typescript
return getDb().query.stackDependency.findFirst({
  where: { npmPackage: input.npmPackage }
});
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm typecheck` from workspace root.
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/repositories/stack-dependency.repository.ts
git commit -m "fix(db): stackDependencyRepository.upsert targets npm_package alone"
```

---

## Task 4: Fix `upsertFromDetection` RPC to redirect to owning stack

**Files:**

- Modify: `packages/api/src/routers/stacks.router.ts:258-306`

- [ ] **Step 1: Rewrite the handler to check package ownership before inserting**

Replace the `upsertFromDetection` handler body with:

```typescript
.handler(async ({ input }) => {
  const results: Array<{ id: string; name: string }> = [];

  const seenNames = new Set<string>();
  for (const s of input.stacks) {
    if (seenNames.has(s.name)) continue;
    seenNames.add(s.name);

    // 1. Try to find existing stack by primary npm package alias
    let stack = await stackRepository.findByNpmPackageAlias(s.npmPackage);

    // 2. Try to find by exact name match
    if (!stack) {
      stack = await stackRepository.findByName(s.name);
    }

    // 3. If not found, create a new stack
    if (!stack) {
      const all = await stackRepository.findAll();
      const nextSortOrder = all.length > 0 ? Math.max(...all.map((st) => st.sortOrder)) + 1 : 0;
      stack = await stackRepository.create(
        {
          name: s.name,
          description: s.description ?? null,
          icon: s.iconSvg ? sanitizeSvg(s.iconSvg) : null,
          type: s.type,
          confidence: s.confidence ?? null,
          sortOrder: nextSortOrder
        },
        { includedInPortfolio: false }
      );
    }

    if (stack) {
      // Link the primary package + all related packages as stack dependencies.
      // For each package: if it already belongs to a different stack, skip it
      // (the global unique constraint enforces one-owner; the workflow dedup
      // step should have absorbed it, but this is the safety net).
      const allPackages = Array.from(new Set([s.npmPackage, ...(s.relatedPackages ?? [])]));
      for (const pkg of allPackages) {
        const existing = await stackDependencyRepository.findByNpmPackage(pkg);
        if (existing && existing.stackId !== stack.id) {
          // Package already belongs to another stack — skip.
          // The workflow should have absorbed this group into the existing stack.
          continue;
        }
        await stackDependencyRepository.upsert({
          stackId: stack.id,
          npmPackage: pkg,
          description: s.description ?? null,
          version: null,
          homepage: null,
          monthlyDownloads: null,
          lastRefreshedAt: null
        });
      }
      results.push({ id: stack.id, name: stack.name });
    }
  }

  return results;
})
```

- [ ] **Step 2: Add `findByNpmPackage` method to repository**

In `packages/db/src/repositories/stack-dependency.repository.ts`, add:

```typescript
async findByNpmPackage(npmPackage: string): Promise<StackDependencyEntity | undefined> {
  return getDb().query.stackDependency.findFirst({
    where: { npmPackage }
  });
},
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm typecheck` from workspace root.
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/stacks.router.ts packages/db/src/repositories/stack-dependency.repository.ts
git commit -m "fix(api): upsertFromDetection skips packages owned by other stacks"
```

---

## Task 5: Add dedup step in detection workflow after AI categorization

**Files:**

- Modify: `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts:243-443` (after `aiCategorize`)

This is the root-cause fix. After the AI categorizes unknown packages, a new step checks whether any categorized package already belongs to an existing stack (via `existingDependencies` lookup). If so, the entire group (all packages sharing the same display name) is reassigned to the existing stack.

- [ ] **Step 1: Create `deduplicateGroups` step after `aiCategorize`**

Add a new step between `aiCategorize` and `resolveIcons`:

```typescript
const deduplicateGroups = createStep({
  id: "deduplicate-groups",
  description: "Ensures no two stacks share a package; absorbs groups into existing stacks",
  inputSchema: aiCategorize.outputSchema,
  outputSchema: z.object({
    matched: z.array(
      z.object({
        npmPackage: z.string(),
        stackId: z.string(),
        name: z.string(),
        repo: z.string(),
        relatedPackages: z.array(z.string())
      })
    ),
    categorized: z.array(
      z.object({
        npmPackage: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string().nullable(),
        confidence: z.enum(["high", "medium", "low"]),
        repo: z.string(),
        relatedPackages: z.array(z.string()),
        iconSvg: z.string().nullable(),
        stackId: z.string().nullable(),
        existingStackId: z.string().nullable()
      })
    )
  }),
  execute: async ({ inputData, getInitData }) => {
    const { matched, categorized } = inputData;
    const initData = getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;

    // Build lookup: npmPackage → stackId (from existing DB state)
    const dependencyOwnerMap = new Map(
      initData.existingDependencies.map((d) => [d.npmPackage, d.stackId])
    );

    // Also build from matched entries (from programmatic-match step in this run)
    for (const m of matched) {
      dependencyOwnerMap.set(m.npmPackage, m.stackId);
    }

    // Group categorized entries by display name
    const groupsByName = new Map<string, typeof categorized>();
    for (const cat of categorized) {
      const list = groupsByName.get(cat.name) ?? [];
      list.push(cat);
      groupsByName.set(cat.name, list);
    }

    const resolvedMatched: typeof matched = [];
    const resolvedCategorized: typeof categorized = [];

    for (const [groupName, group] of groupsByName) {
      // Check if ANY package in this group already belongs to an existing stack
      let ownerStackId: string | null = null;
      for (const cat of group) {
        const existingOwner = dependencyOwnerMap.get(cat.npmPackage);
        if (existingOwner) {
          ownerStackId = existingOwner;
          break;
        }
      }

      if (ownerStackId) {
        // Absorb entire group into the existing stack
        for (const cat of group) {
          resolvedMatched.push({
            npmPackage: cat.npmPackage,
            stackId: ownerStackId,
            name: groupName,
            repo: cat.repo,
            relatedPackages: []
          });
        }
      } else {
        // No overlap — keep as new categorized entries
        resolvedCategorized.push(...group);
      }
    }

    return { matched: resolvedMatched, categorized: resolvedCategorized };
  }
});
```

- [ ] **Step 2: Wire the step into the workflow chain**

Change:

```typescript
.then(aiCategorize)
.then(resolveIcons)
```

To:

```typescript
.then(aiCategorize)
.then(deduplicateGroups)
.then(resolveIcons)
```

- [ ] **Step 3: Update `resolveIcons` input schema**

`resolveIcons` currently takes `aiCategorize.outputSchema` as input. Since `deduplicateGroups` has the same output schema, update `resolveIcons.inputSchema` to `deduplicateGroups.outputSchema`:

```typescript
inputSchema: deduplicateGroups.outputSchema,
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm typecheck` from workspace root.
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow.ts
git commit -m "feat(agent): add dedup step to absorb overlapping groups into existing stacks"
```

---

## Task 6: Fix `format` step to handle cross-stack package conflicts

**Files:**

- Modify: `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts:509-655`

After the `deduplicateGroups` step absorbs groups, the `format` step's "merge and deduplicate by npmPackage" logic (`seen` map at line 586-591) already handles the case where the same package appears in multiple entries — it keeps the first occurrence. With `deduplicateGroups` running first, this should naturally produce clean output. But we need to add a defensive check: if two different display-name groups claim the same npm package (which shouldn't happen after dedup, but could if the AI returns duplicates), the one with an `existingStackId` wins.

- [ ] **Step 1: Add defensive dedup in `format` step**

In the `format` step, after building `allStacks` (line 592), before grouping by name, add:

```typescript
// Defensive: if two entries claim the same npmPackage, prefer the one with
// existingStackId (it's already in the DB) or the first one seen.
const dedupedByPackage = new Map<string, (typeof allStacks)[number]>();
for (const stack of allStacks) {
  const existing = dedupedByPackage.get(stack.npmPackage);
  if (!existing || (stack.existingStackId && !existing.existingStackId)) {
    dedupedByPackage.set(stack.npmPackage, stack);
  }
}
const deduplicatedAllStacks = Array.from(dedupedByPackage.values());
```

Then use `deduplicatedAllStacks` instead of `allStacks` in the subsequent grouping-by-name logic.

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck` from workspace root.
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow.ts
git commit -m "fix(agent): defensive dedup in format step prefers existing stack ownership"
```

---

## Edge Cases Covered

| Edge Case                                                    | How It's Handled                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Package already belongs to another stack (RPC)               | `upsertFromDetection` checks ownership, skips if different owner        |
| AI groups packages but one already belongs to existing stack | `deduplicateGroups` step absorbs entire group into existing stack       |
| Same package appears in two categorized groups               | `format` step deduplicates by `npmPackage`, prefers `existingStackId`   |
| `ON CONFLICT` mismatch with constraint                       | Schema reverted to `(npm_package)` unique; upsert targets `npm_package` |
| `findByNpmPackageAlias` query                                | Already queries by `npmPackage` alone — consistent with global unique   |
| `stackRepository.merge` / `batchMerge`                       | Already handles reassign-or-delete for global unique — no change needed |
| Manual `addDependency` RPC                                   | Uses same `stackDependencyRepository.upsert` — automatically fixed      |
| `removeDependency` RPC                                       | Uses `deleteByNpmPackage(stackId, npmPackage)` — no change needed       |
| `refreshDependenciesWorkflow`                                | Only updates metadata, no inserts — no change needed                    |

---

## Verification

After all tasks:

1. Run `pnpm typecheck` — must pass
2. Manually trigger stack detection for a project with overlapping packages
3. Verify `stack_dependency` table has no duplicate `npm_package` values: `SELECT npm_package, COUNT(*) FROM stack_dependency GROUP BY npm_package HAVING COUNT(*) > 1` should return 0 rows
4. Verify that when detection finds a package already belonging to stack X, the entire group is absorbed into stack X
