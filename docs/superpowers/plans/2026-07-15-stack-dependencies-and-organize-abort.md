# Stack Dependencies in Router + Organize Abort Controller

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed stack dependencies into create/update/get/list endpoints so one query returns all data, add npm autocomplete to the stack form, remove `monthlyDownloads` column, and wire abort controller for organize workflow cancellation.

**Architecture:** Dependencies flow through `StackOutput` schema → repository joins → router handlers → form local state. Abort controller wires from mutation hook → API generator → upstream fetch abort.

**Tech Stack:** Zod schemas, Drizzle ORM, oRPC, TanStack Query, React hooks

**refresh-dependencies-workflow:** DEPRECATED

---

## Task 1: Remove `monthlyDownloads` from stack dependencies

**Files:**

- Modify: `packages/db/src/schema/stack-dependency.schema.ts`
- Modify: `apps/agent/src/mastra/workflows/refresh-dependencies-workflow.ts`
- Modify: `packages/api/src/routers/stacks.router.ts`

- [ ] **Step 1: Remove column from Drizzle schema**

In `packages/db/src/schema/stack-dependency.schema.ts`, delete the `monthlyDownloads` line:

```ts
// DELETE this line:
monthlyDownloads: integer("monthly_downloads"),
```

- [ ] **Step 2: Remove from refresh-dependencies workflow**

In `apps/agent/src/mastra/workflows/refresh-dependencies-workflow.ts`:

1. Remove `monthlyDownloads` from `NpmMetadata` type (line 19)
2. Remove the downloads fetch and `monthlyDownloads` variable (lines 24, 46-50)
3. Remove `monthlyDownloads` from the return value (line 52)
4. Remove `monthlyDownloads: meta.monthlyDownloads` from the `.set()` call (line 83)

The `fetchNpmMetadata` function should only fetch registry data (description, version, homepage), not downloads.

- [ ] **Step 3: Remove from stacks router `addDependency` input**

In `packages/api/src/routers/stacks.router.ts`, remove `monthlyDownloads` from the `addDependency` input schema (line 259):

```ts
// DELETE this line from the input z.object:
monthlyDownloads: z.number().int().nullable().optional();
```

Also remove `monthlyDownloads: data.monthlyDownloads ?? null` from the upsert call (line 274).

- [ ] **Step 4: Remove from `upsertFromDetection` handler**

In the same file, remove `monthlyDownloads: null` from the `stackDependencyRepository.upsert` call in `upsertFromDetection` (line 357).

- [ ] **Step 5: Generate migration**

Run from `packages/db`:

```bash
pnpm drizzle-kit generate
```

This creates a migration that runs `ALTER TABLE "stack_dependency" DROP COLUMN "monthly_downloads"`.

- [ ] **Step 6: Verify types compile**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/stack-dependency.schema.ts packages/db/migrations apps/agent/src/mastra/workflows/refresh-dependencies-workflow.ts packages/api/src/routers/stacks.router.ts
git commit -m "feat(db): remove monthlyDownloads column from stack_dependency"
```

---

## Task 2: Add dependency schema to core types

**Files:**

- Modify: `packages/core/src/stack/types.ts`

- [ ] **Step 1: Add `StackDependencyItemSchema` and update output/input schemas**

```ts
// Add before StackOutputSchema
export const StackDependencyItemSchema = z.object({
  npmPackage: z.string(),
  description: z.string().nullable().optional(),
  homepage: z.string().nullable().optional()
});

export type StackDependencyItem = z.infer<typeof StackDependencyItemSchema>;
```

Add `dependencies` field to `StackOutputSchema`:

```ts
dependencies: z.array(StackDependencyItemSchema);
```

Add `dependencies` field to `StackCreateInputSchema`:

```ts
dependencies: z.array(StackDependencyItemSchema).optional();
```

Add `dependencies` field to `StackUpdateInputSchema`:

```ts
dependencies: z.array(StackDependencyItemSchema).optional();
```

**Important:** Remove the `satisfies z.ZodType<...>` constraints from all three schemas. The DB-derived types (`StackSchemaSelect`, `StackSchemaInsert`) don't include `dependencies`, so the `satisfies` will cause type errors. The schemas are validated at runtime by oRPC/Zod anyway.

Also note: the DB `stack_dependency` table still has a `version` column (used by the refresh-dependencies workflow), but the API contract intentionally does not expose it.

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/stack/types.ts
git commit -m "feat(core): add dependencies field to stack schemas"
```

---

## Task 3: Update stack repository to handle dependencies

**Files:**

- Modify: `packages/db/src/repositories/stack.repository.ts`
- Modify: `packages/db/src/repositories/stack-dependency.repository.ts`

- [ ] **Step 1: Add `syncForStack` method to `stackDependencyRepository`**

In `stack-dependency.repository.ts`, add a method that replaces all dependencies for a stack in a transaction:

```ts
async syncForStack(stackId: string, dependencies: Array<{
  npmPackage: string;
  description?: string | null;
  homepage?: string | null;
}>) {
  return getDb().transaction(async (tx) => {
    await tx.delete(stackDependency).where(eq(stackDependency.stackId, stackId));

    if (dependencies.length > 0) {
      await tx.insert(stackDependency).values(
        dependencies.map((dep) => ({
          id: crypto.randomUUID(),
          stackId,
          npmPackage: dep.npmPackage,
          description: dep.description ?? null,
          homepage: dep.homepage ?? null,
          lastRefreshedAt: null
        }))
      );
    }
  });
}
```

- [ ] **Step 2: Add `findAllWithDependencies` to `stackRepository`**

In `stack.repository.ts`, add a method that returns all stacks with their dependencies joined:

```ts
async findAllWithDependencies() {
  const stacks = await this.findAll();
  const allDeps = await stackDependencyRepository.findAll();

  const depsByStack = new Map<string, typeof allDeps>();
  for (const dep of allDeps) {
    const list = depsByStack.get(dep.stackId) ?? [];
    list.push(dep);
    depsByStack.set(dep.stackId, list);
  }

  return stacks.map((s) => ({
    ...s,
    dependencies: (depsByStack.get(s.id) ?? []).map((d) => ({
      npmPackage: d.npmPackage,
      description: d.description,
      homepage: d.homepage
    }))
  }));
}
```

- [ ] **Step 3: Update `stackRepository.create` to accept dependencies**

Add `dependencies` parameter to the `create` method options:

```ts
async create(
  input: CreateStackData,
  options?: { includedInPortfolio?: boolean; dependencies?: Array<{ npmPackage: string; description?: string | null; homepage?: string | null }> }
) {
  // ... existing transaction code ...
  // After creating stack, sync dependencies inside the same transaction
  if (options?.dependencies && options.dependencies.length > 0) {
    await tx.insert(stackDependency).values(
      options.dependencies.map((dep) => ({
        id: crypto.randomUUID(),
        stackId: id,
        npmPackage: dep.npmPackage,
        description: dep.description ?? null,
        homepage: dep.homepage ?? null,
        lastRefreshedAt: null
      }))
    );
  }
}
```

- [ ] **Step 4: Update `stackRepository.update` to accept dependencies**

Add `dependencies` parameter to the `update` method options:

```ts
async update(
  id: string,
  input: UpdateStackData,
  options?: { includedInPortfolio?: boolean; dependencies?: Array<{ npmPackage: string; description?: string | null; homepage?: string | null }> }
) {
  return getDb().transaction(async (tx) => {
    // ... existing update code ...

    // Sync dependencies inside the same transaction
    if (options?.dependencies !== undefined) {
      await tx.delete(stackDependency).where(eq(stackDependency.stackId, id));
      if (options.dependencies.length > 0) {
        await tx.insert(stackDependency).values(
          options.dependencies.map((dep) => ({
            id: crypto.randomUUID(),
            stackId: id,
            npmPackage: dep.npmPackage,
            description: dep.description ?? null,
            homepage: dep.homepage ?? null,
            lastRefreshedAt: null
          }))
        );
      }
    }

    return tx.query.stack.findFirst({ where: { id } });
  });
}
```

- [ ] **Step 5: Verify types compile**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/repositories/stack.repository.ts packages/db/src/repositories/stack-dependency.repository.ts
git commit -m "feat(db): add dependency sync to stack repository create/update"
```

---

## Task 4: Update API router handlers

**Files:**

- Modify: `packages/api/src/routers/stacks.router.ts`
- Modify: `packages/api/src/routers/portfolio.mappers.ts`

- [ ] **Step 1: Update `list` handler to use `findAllWithDependencies`**

```ts
list: protectedProcedure
  .route({ description: "List all tech stacks", method: "GET" })
  .output(StackListOutputSchema)
  .handler(async () => {
    const stacks = await stackRepository.findAllWithDependencies();
    return stacks.map(toStackOutput);
  }),
```

- [ ] **Step 2: Update `get` handler to include dependencies**

```ts
get: publicProcedure
  .route({ description: "Get a single stack by ID", method: "GET" })
  .input(z.object({ id: z.string() }))
  .output(StackOutputSchema.nullable())
  .handler(async ({ input }) => {
    const stack = await stackRepository.findById(input.id);
    if (!stack) return null;
    const deps = await stackDependencyRepository.findByStackId(input.id);
    return toStackOutput({
      ...stack,
      dependencies: deps.map((d) => ({
        npmPackage: d.npmPackage,
        description: d.description,
        homepage: d.homepage
      }))
    });
  }),
```

- [ ] **Step 3: Update `create` handler to pass dependencies**

```ts
create: protectedProcedure
  .route({ description: "Create a new tech stack", method: "POST" })
  .input(StackCreateInputSchema)
  .output(StackOutputSchema)
  .handler(async ({ input }) => {
    const { includedInPortfolio, name, description, icon, dependencies } = input;
    // ... existing name check and sortOrder logic ...
    const created = await stackRepository.create(
      { name, description: description ?? null, icon: icon ?? null, sortOrder: nextSortOrder },
      { includedInPortfolio, dependencies: dependencies ?? [] }
    );
    return toStackOutput(created!);
  }),
```

- [ ] **Step 4: Update `update` handler to pass dependencies**

```ts
update: protectedProcedure
  .route({ description: "Update a tech stack", method: "PATCH" })
  .input(z.object({ id: z.string(), data: StackUpdateInputSchema }))
  .output(StackOutputSchema.nullable())
  .handler(async ({ input }) => {
    const { includedInPortfolio, dependencies, ...updateData } = input.data;
    // ... existing name check logic ...
    const updated = await stackRepository.update(input.id, updateData, {
      includedInPortfolio,
      dependencies
    });
    return updated ? toStackOutput(updated) : null;
  }),
```

- [ ] **Step 5: Update `toStackOutput` mapper**

In `portfolio.mappers.ts`, update the mapper to handle dependencies:

```ts
type StackRowWithDeps = StackRow & {
  dependencies?: Array<{
    npmPackage: string;
    description: string | null;
    homepage: string | null;
  }>;
};

export function toStackOutput(s: StackRowWithDeps): StackOutput {
  return {
    // ... existing fields ...
    dependencies: (s.dependencies ?? []).map((d) => ({
      npmPackage: d.npmPackage,
      description: d.description,
      homepage: d.homepage
    }))
  };
}
```

- [ ] **Step 6: Verify types compile**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routers/stacks.router.ts packages/api/src/routers/portfolio.mappers.ts
git commit -m "feat(api): embed dependencies in stack create/update/get/list"
```

---

## Task 5: Replace DependencyManager with npm autocomplete in StackForm

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx`

- [ ] **Step 1: Remove `DependencyManager` component**

Delete the entire `DependencyManager` function (lines 44-152).

- [ ] **Step 2: Add npm search query and form state for dependencies**

In `StackForm`, add dependency state and npm search:

```ts
const [dependencies, setDependencies] = useState<
  Array<{
    npmPackage: string;
    description: string | null;
    homepage: string | null;
  }>
>(stack?.dependencies ?? []);

const [depSearchQuery, setDepSearchQuery] = useState("");
const [depDebouncedQuery] = useDebouncedValue(depSearchQuery, 300);

const npmSearchQuery = useQuery({
  ...orpcQueryClient.stacks.searchNpm.queryOptions({ input: { query: depDebouncedQuery } }),
  enabled: depDebouncedQuery.length >= 2
});

const searchResults = npmSearchQuery.data?.items ?? [];
const existingPackages = new Set(dependencies.map((d) => d.npmPackage));
```

- [ ] **Step 3: Add npm autocomplete UI in the form**

Replace the DependencyManager section (lines 300-305) with:

```tsx
<div className="flex flex-col gap-2">
  <label className="text-sm font-medium">Dependencies</label>
  <div className="flex flex-col gap-2">
    <div className="relative">
      <Input
        placeholder="Search npm packages..."
        value={depSearchQuery}
        onChange={(e) => setDepSearchQuery(e.target.value)}
      />
      {searchResults.length > 0 && depDebouncedQuery.length >= 2 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-background shadow-md">
          {searchResults.map((item) => (
            <button
              key={item.name}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
              disabled={existingPackages.has(item.name)}
              onClick={() => {
                setDependencies((prev) => [
                  ...prev,
                  {
                    npmPackage: item.name,
                    description: item.description || null,
                    homepage: item.links.npm || null
                  }
                ]);
                setDepSearchQuery("");
              }}
            >
              <Plus className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{item.name}</span>
              {item.description && (
                <span className="truncate text-xs text-muted-foreground">{item.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
    {dependencies.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {dependencies.map((dep) => (
          <Badge key={dep.npmPackage} variant="secondary" size="lg" className="gap-1 pr-1">
            {dep.npmPackage}
            <button
              type="button"
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
              onClick={() =>
                setDependencies((prev) => prev.filter((d) => d.npmPackage !== dep.npmPackage))
              }
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 4: Pass dependencies in create/update mutations**

Update `onSubmit` to include dependencies:

```ts
onSubmit: ({ value }) => {
  if (isEdit && id) {
    updateMutation.mutate({
      id,
      data: {
        name: value.name,
        description: value.description || null,
        icon: value.icon ? sanitizeSvg(value.icon) : null,
        includedInPortfolio: value.includedInPortfolio,
        dependencies
      }
    });
  } else {
    createMutation.mutate({
      name: value.name,
      description: value.description ?? null,
      icon: value.icon ? sanitizeSvg(value.icon) : null,
      includedInPortfolio: value.includedInPortfolio,
      dependencies
    });
  }
};
```

- [ ] **Step 5: Initialize dependencies from loaded stack in edit mode**

Add effect to sync dependencies when stack loads:

```ts
useEffect(() => {
  if (stack?.dependencies) {
    setDependencies(stack.dependencies);
  }
}, [stack?.dependencies]);
```

- [ ] **Step 6: Remove unused imports**

Remove `orpcQueryClient.stacks.listDependencies`, `orpcQueryClient.stacks.addDependency`, and `orpcQueryClient.stacks.removeDependency` references.

- [ ] **Step 7: Verify types compile**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx
git commit -m "feat(web): replace DependencyManager with npm autocomplete in StackForm"
```

---

## Task 6: Show dependencies in ItemInfoPanel on stacks page

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`

- [ ] **Step 1: Add dependencies section to ItemInfoPanel**

After the Markdown description section (line 576), add:

```tsx
{
  item.dependencies && item.dependencies.length > 0 && (
    <div className="mt-4">
      <h4 className="mb-2 text-sm font-medium">Dependencies</h4>
      <div className="flex flex-wrap gap-1.5">
        {item.dependencies.map((dep) => (
          <Badge key={dep.npmPackage} variant="secondary" size="sm">
            {dep.npmPackage}
          </Badge>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/dashboard/stacks/stacks-page.tsx
git commit -m "feat(web): show stack dependencies in ItemInfoPanel"
```

---

## Task 7: Wire abort controller for organize workflow cancellation

**Files:**

- Modify: `apps/web/src/features/stacks/api/organize-stacks.ts`
- Modify: `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`

- [ ] **Step 1: Add AbortController to `useOrganizeStacksMutation`**

Update the mutation to accept and use an abort signal:

```ts
export function useOrganizeStacksMutation() {
  return useMutation({
    mutationFn: async (input: {
      onStepChange?: (step: string | null) => void;
      signal?: AbortSignal;
    }): Promise<OrganizeStacksOutput> => {
      const { onStepChange, signal } = input;
      // ... existing result setup ...

      onStepChange?.("Initializing");

      const iterator = await orpcClient.agent.organizeStacks({}, { signal });

      for await (const raw of iterator) {
        if (signal?.aborted) break;
        // ... existing event parsing ...
      }

      return result;
    }
  });
}
```

- [ ] **Step 2: Wire AbortController in stacks page**

In `stacks-page.tsx`, create an abort controller and pass it to the mutation:

```ts
const organizeAbortRef = useRef<AbortController | null>(null);

function handleStartOrganize() {
  const controller = new AbortController();
  organizeAbortRef.current = controller;
  setOrganizeStep("Initializing");
  organizeMutation.mutate(
    { onStepChange: setOrganizeStep, signal: controller.signal },
    {
      onSuccess: (data) => {
        /* ... existing ... */
      },
      onError: (error) => {
        if (error.name === "AbortError") {
          toast.info("Organize cancelled.");
        } else {
          console.error("[stacks] Organize failed:", error);
          toast.error("Failed to organize stacks.");
        }
        setOrganizeStep(null);
      }
    }
  );
}

function handleCancelOrganize() {
  organizeAbortRef.current?.abort();
  setOrganizeStep(null);
}
```

- [ ] **Step 3: Add `useRef` import**

Add `useRef` to the React imports in `stacks-page.tsx`.

- [ ] **Step 4: Verify types compile**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/stacks/api/organize-stacks.ts apps/web/src/pages/dashboard/stacks/stacks-page.tsx
git commit -m "feat(web): wire abort controller for organize workflow cancellation"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck` from workspace root
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint` from workspace root
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Manual smoke test**

- Open stacks page → verify dependencies load in grid cards
- Click a stack → verify dependencies show in ItemInfoPanel
- Create new stack → verify npm autocomplete works, deps submit with form
- Edit stack → verify existing deps load, can add/remove, submit updates deps
- Run organize → verify cancel button actually aborts the workflow
