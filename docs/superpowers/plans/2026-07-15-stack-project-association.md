# Stack ↔ Project Association Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable stacks to return associated projects and accept `projectIds` in create/update, with a `ComboboxMultipleField` in the stack form.

**Architecture:** Mirror the project-side pattern: stack repo gets `projectIds` handling in create/update via delete-all-reinsert on `projectStack`. Stack output includes minimal `{ id, name, logo }` projects array. Stack form adds a multi-select combobox for projects.

**Tech Stack:** Drizzle ORM, oRPC, TanStack Query, React Hook Form (via `useAppForm`), `@tsu-stack/ui` Combobox

---

## File Map

| File                                                    | Change                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/core/src/stack/types.ts`                      | Add `projects` to output schema, `projectIds` to create/update schemas                            |
| `packages/db/src/repositories/stack.repository.ts`      | Add project sync in `create`/`update`, batch-load projects in `findAll`, eager-load in `findById` |
| `packages/api/src/routers/stacks.router.ts`             | Pass `projectIds` through create/update, load projects in get                                     |
| `packages/api/src/routers/portfolio.mappers.ts`         | Add `projects` to `StackRow`, map in `toStackOutput`                                              |
| `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx` | Add `projectIds` field + `ComboboxMultipleField`                                                  |
| `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`   | Add projects badges in `ItemInfoPanel`                                                            |

---

### Task 1: Core Types

**Files:**

- Modify: `packages/core/src/stack/types.ts`

- [ ] **Step 1: Add `projects` field to `StackOutputSchema`**

Add after the `dependencies` field (line 35):

```ts
projects: z.array(z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable()
})),
```

- [ ] **Step 2: Add `projectIds` to `StackCreateInputSchema`**

Add after `dependencies` (line 48):

```ts
projectIds: z.array(z.string()).optional();
```

- [ ] **Step 3: Add `projectIds` to `StackUpdateInputSchema`**

Add after `dependencies` (line 57):

```ts
projectIds: z.array(z.string()).optional();
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "stack/types" | grep "error TS"`
Expected: No output (no errors in this file)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/stack/types.ts
git commit -m "feat(core): add projects and projectIds to stack schemas"
```

---

### Task 2: Repository — `create` and `update`

**Files:**

- Modify: `packages/db/src/repositories/stack.repository.ts`

**Pattern reference:** `projectRepository.create` (lines 99-113) and `projectRepository.update` (lines 159-176) in `packages/db/src/repositories/project.repository.ts`

- [ ] **Step 1: Add `projectIds` to `create` options**

In the `create` method (line 120), add `projectIds` to the options type:

```ts
async create(
  input: CreateStackData,
  options?: {
    includedInPortfolio?: boolean;
    dependencies?: Array<{
      npmPackage: string;
      description?: string | null;
      homepage?: string | null;
    }>;
    projectIds?: string[];
  }
)
```

- [ ] **Step 2: Add project sync to `create` transaction**

After the dependencies block (after line 167), add:

```ts
if (options?.projectIds && options.projectIds.length > 0) {
  const unique = [...new Set(options.projectIds)];
  const existingProjects = await tx
    .select({ id: project.id })
    .from(project)
    .where(inArray(project.id, unique));
  if (existingProjects.length !== unique.length) {
    throw new Error("One or more projects not found");
  }
  await tx.insert(projectStack).values(
    unique.map((projectId) => {
      return { id: crypto.randomUUID(), projectId, stackId: id };
    })
  );
}
```

Add `project` import at the top: `import { project, projectStack } from "#@/schema/project.schema";`

- [ ] **Step 3: Add `projectIds` to `update` options**

In the `update` method (line 173), add `projectIds` to the options type:

```ts
async update(
  id: string,
  input: UpdateStackData,
  options?: {
    includedInPortfolio?: boolean;
    dependencies?: Array<{
      npmPackage: string;
      description?: string | null;
      homepage?: string | null;
    }>;
    projectIds?: string[];
  }
)
```

- [ ] **Step 4: Add project sync to `update` transaction**

After the dependencies block (after line 226), add:

```ts
if (options?.projectIds !== undefined) {
  await tx.delete(projectStack).where(eq(projectStack.stackId, id));
  if (options.projectIds.length > 0) {
    const unique = [...new Set(options.projectIds)];
    const existingProjects = await tx
      .select({ id: project.id })
      .from(project)
      .where(inArray(project.id, unique));
    if (existingProjects.length !== unique.length) {
      throw new Error("One or more projects not found");
    }
    await tx.insert(projectStack).values(
      unique.map((projectId) => {
        return { id: crypto.randomUUID(), projectId, stackId: id };
      })
    );
  }
}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "stack.repository" | grep "error TS"`
Expected: No output

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/repositories/stack.repository.ts
git commit -m "feat(db): add projectIds handling to stack create/update"
```

---

### Task 3: Repository — `findAll` and `findById`

**Files:**

- Modify: `packages/db/src/repositories/stack.repository.ts`

- [ ] **Step 1: Batch-load projects in `findAllWithDependencies`**

In `findAllWithDependencies` (line 58), after loading deps, batch-load projects. Replace the method body:

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

  // Batch-load projects for all stacks
  const stackIds = stacks.map((s) => s.id);
  const allProjectLinks = stackIds.length > 0
    ? await getDb()
        .select({
          stackId: projectStack.stackId,
          projectId: project.id,
          projectName: project.title,
          projectLogo: project.logo
        })
        .from(projectStack)
        .innerJoin(project, eq(projectStack.projectId, project.id))
        .where(inArray(projectStack.stackId, stackIds))
    : [];

  const projectsByStack = new Map<string, Array<{ id: string; name: string; logo: string | null }>>();
  for (const link of allProjectLinks) {
    const list = projectsByStack.get(link.stackId) ?? [];
    list.push({ id: link.projectId, name: link.projectName, logo: link.projectLogo });
    projectsByStack.set(link.stackId, list);
  }

  return stacks.map((s) => {
    return {
      ...s,
      dependencies: (depsByStack.get(s.id) ?? []).map((d) => {
        return {
          npmPackage: d.npmPackage,
          description: d.description,
          homepage: d.homepage
        };
      }),
      projects: projectsByStack.get(s.id) ?? []
    };
  });
},
```

Add `project` to the existing import on line 15: change `import { projectStack } from "#@/schema/project.schema";` to `import { project, projectStack } from "#@/schema/project.schema";`

- [ ] **Step 2: Update `findById` to eager-load projects**

Replace the `findById` method (line 97):

```ts
async findById(id: string) {
  return getDb().query.stack.findFirst({
    where: { id },
    with: {
      projects: {
        with: {
          project: {
            columns: { id: true, title: true, logo: true }
          }
        }
      }
    }
  });
},
```

Note: This returns `projects: [{ project: { id, title, logo } }]` — the router/mapper will flatten to `{ id, name, logo }`.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "stack.repository" | grep "error TS"`
Expected: No output (or only pre-existing errors unrelated to this file)

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/repositories/stack.repository.ts
git commit -m "feat(db): add project loading to stack findAll and findById"
```

---

### Task 4: Portfolio Mapper

**Files:**

- Modify: `packages/api/src/routers/portfolio.mappers.ts`

- [ ] **Step 1: Add `projects` to `StackRow` type**

Add after `dependencies` (line 28):

```ts
projects?: Array<{
  id: string;
  name: string;
  logo: string | null;
}>;
```

- [ ] **Step 2: Map projects in `toStackOutput`**

Add after the `dependencies` mapping (after line 52):

```ts
projects: (s.projects ?? []).map((p) => {
  return {
    id: p.id,
    name: p.name,
    logo: p.logo
  };
}),
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "portfolio.mappers" | grep "error TS"`
Expected: No output

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/portfolio.mappers.ts
git commit -m "feat(api): add projects to StackRow and toStackOutput mapper"
```

---

### Task 5: API Router

**Files:**

- Modify: `packages/api/src/routers/stacks.router.ts`

- [ ] **Step 1: Update `get` handler to load projects**

The `findById` now returns projects via the relation. But the `get` handler also loads deps separately. Update to use the relation-based output. Replace the `get` handler (lines 54-75):

```ts
get: publicProcedure
  .route({
    description: "Get a single stack by ID",
    method: "GET"
  })
  .input(z.object({ id: z.string() }))
  .output(StackOutputSchema.nullable())
  .handler(async ({ input }) => {
    const stack = await stackRepository.findById(input.id);
    if (!stack) return null;
    const deps = await stackDependencyRepository.findByStackId(input.id);
    return toStackOutput({
      ...stack,
      name: stack.name,
      icon: stack.icon,
      description: stack.description,
      type: stack.type,
      healthStatus: stack.healthStatus,
      confidence: stack.confidence,
      sortOrder: stack.sortOrder,
      portfolioEntryId: stack.portfolioEntryId,
      dependencies: deps.map((d) => ({
        npmPackage: d.npmPackage,
        description: d.description,
        homepage: d.homepage
      })),
      projects: (stack.projects ?? []).map((ps) => ({
        id: ps.project.id,
        name: ps.project.title,
        logo: ps.project.logo
      }))
    });
  }),
```

- [ ] **Step 2: Update `create` handler to pass `projectIds`**

In the `create` handler (line 83), extract `projectIds` and pass to repo. Replace the handler body:

```ts
.handler(async ({ input }) => {
  const { includedInPortfolio, name, description, icon, dependencies, projectIds } = input;
  const existing = await stackRepository.findByName(name);
  if (existing) {
    throw new ORPCError("CONFLICT", {
      message: "A stack with this name already exists."
    });
  }
  const all = await stackRepository.findAll();
  const nextSortOrder = all.length > 0 ? Math.max(...all.map((s) => s.sortOrder)) + 1 : 0;
  const created = await stackRepository.create(
    { name, description: description ?? null, icon: icon ?? null, sortOrder: nextSortOrder },
    { includedInPortfolio, dependencies: dependencies ?? [], projectIds }
  );
  return toStackOutput(created!);
}),
```

- [ ] **Step 3: Update `update` handler to pass `projectIds`**

In the `update` handler (line 106), extract `projectIds` and pass to repo. Replace the handler body:

```ts
.handler(async ({ input }) => {
  const { includedInPortfolio, dependencies, projectIds, ...updateData } = input.data;
  if (updateData.name) {
    const existing = await stackRepository.findByName(updateData.name);
    if (existing && existing.id !== input.id) {
      throw new ORPCError("CONFLICT", {
        message: "A stack with this name already exists."
      });
    }
  }
  const updated = await stackRepository.update(input.id, updateData, {
    includedInPortfolio,
    dependencies,
    projectIds
  });
  return updated ? toStackOutput(updated) : null;
}),
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "stacks.router" | grep "error TS"`
Expected: No output

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/stacks.router.ts
git commit -m "feat(api): pass projectIds through stack create/update, load projects in get"
```

---

### Task 6: Stack Form UI

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx`

**Pattern reference:** `project-form.tsx` lines 280-312 for `ComboboxMultipleField` usage with stacks

- [ ] **Step 1: Add projects query**

After the `stackQuery` (line 51), add:

```ts
const projectsQuery = useQuery({
  ...orpcQueryClient.projects.list.queryOptions({})
});
```

- [ ] **Step 2: Add `projectIds` to default values**

In the `defaultValues` (line 100), add:

```ts
projectIds: (stack?.projects ?? []).map((p) => p.id),
```

- [ ] **Step 3: Add `projectIds` field to the form**

In the `onSubmit` handler, add `projectIds` to both create and update mutation inputs:

For `updateMutation.mutate` (line 116), add:

```ts
projectIds: value.projectIds;
```

For `createMutation.mutate` (line 127), add:

```ts
projectIds: value.projectIds;
```

- [ ] **Step 4: Add `projectIds` to the `useEffect` reset**

In the `useEffect` (line 141), add to the `form.reset` call:

```ts
projectIds: stack.projects.map((p) => p.id),
```

- [ ] **Step 5: Add `ComboboxMultipleField` to the form JSX**

After the `dependencies` field (line 216), add:

```tsx
<form.AppField name="projectIds">
  {(field) => (
    <field.ComboboxMultipleField
      label="Projects"
      description="Link projects that use this stack."
      placeholder="Search projects..."
      emptyMessage="No projects found."
      items={(projectsQuery.data ?? []).map((p) => ({
        value: p.id,
        label: p.title,
        icon: p.logo ? <Icon icon={p.logo} className="size-4" /> : null
      }))}
    />
  )}
</form.AppField>
```

Add `Icon` import: `import { Icon } from "@/shared/ui/icon";` (check if already imported).

- [ ] **Step 6: Add `projects.list` to invalidation in both mutations**

In `createMutation` `onSuccess` (line 55), add:

```ts
await queryClient.invalidateQueries({
  queryKey: orpcQueryClient.projects.list.queryKey()
});
```

(The `updateMutation` already invalidates `projects.list` at line 83.)

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "stack-form" | grep "error TS"`
Expected: No output

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx
git commit -m "feat(web): add project combobox to stack form"
```

---

### Task 7: ItemInfoPanel

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`

- [ ] **Step 1: Add projects badges section**

After the dependencies section (line 596), add:

```tsx
{
  item.projects && item.projects.length > 0 && (
    <div className="mt-4">
      <h4 className="mb-2 text-sm font-medium">Projects</h4>
      <div className="flex flex-wrap gap-1.5">
        {item.projects.map((project) => (
          <Badge key={project.id} variant="secondary" size="sm">
            {project.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "stacks-page" | grep "error TS"`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/dashboard/stacks/stacks-page.tsx
git commit -m "feat(web): show associated projects in stack info panel"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "Cannot find module" | grep -v "implicitly has" | grep -v "worker-configuration" | grep -v "apps/server"`
Expected: Only pre-existing errors (github-repo, profile, debug, settings files)

- [ ] **Step 2: Verify changed files have no new errors**

Run: `npx tsc --noEmit 2>&1 | grep -E "(stack/types|stack\.repository|portfolio\.mappers|stacks\.router|stack-form|stacks-page)" | grep "error TS" | grep -v "Cannot find module" | grep -v "implicitly has"`
Expected: No output

- [ ] **Step 3: Commit all (if any uncommitted changes)**

```bash
git status
```

Only commit if there are uncommitted changes from this plan.
