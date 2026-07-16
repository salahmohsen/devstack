# Stack ↔ Project Association

**Date:** 2026-07-15
**Status:** Approved
**Approach:** Full replacement from either side (Approach 1)

## Problem

Stacks know how many projects use them (`projectCount`) but not _which_ projects. The stack form has no way to associate projects. Only the project side can manage the many-to-many relationship via `project_stack`.

## Goal

- Stack list/get routes return associated projects (minimal: `{ id, name, logo }`)
- Stack create/update accept `projectIds: string[]` to manage associations
- Stack form gets a `ComboboxMultipleField` for project selection
- Both sides can manage the same junction table symmetrically

## Design

### 1. Core Types (`packages/core/src/stack/types.ts`)

**StackOutputSchema** — add:

```ts
projects: z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    logo: z.string().nullable()
  })
);
```

**StackCreateInputSchema** — add:

```ts
projectIds: z.array(z.string()).optional();
```

**StackUpdateInputSchema** — add:

```ts
projectIds: z.array(z.string()).optional();
```

`projectCount` stays (computed from subquery in list, from `projects.length` in get).

### 2. Repository Layer (`packages/db/src/repositories/stack.repository.ts`)

- `create()` — accept optional `projectIds`, validate existence, insert `projectStack` rows in same transaction
- `update()` — accept optional `projectIds`, if provided: delete all existing `projectStack` rows, re-insert new set (same pattern as `projectRepository.update` handles `stackIds`)
- `findAll()` — keep existing `project_counts` subquery, add lateral/batch load for `{ id, name, logo }` per stack
- `findById()` — eager-load via Drizzle relation: `with: { projects: { with: { project: { columns: { id, name, logo } } } } }`
- `merge()` — already moves `projectStack` rows. No changes needed.

### 3. API Router (`packages/api/src/routers/stacks.router.ts`)

- `stacks.list` — each output includes `projects` array
- `stacks.get` — includes `projects` array
- `stacks.create` — accepts optional `projectIds`, validates IDs, passes to repo
- `stacks.update` — accepts optional `projectIds`, when provided replaces all links, when omitted leaves links untouched
- No new endpoints. Delete/merge already handle cascades.

### 4. Stack Form UI (`apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx`)

- Add `projectIds` field (array of strings, defaults to `stack.projects.map(p => p.id)` on edit, `[]` on create)
- Add `ComboboxMultipleField` bound to `projectIds`, after dependencies field
- Options from `projects.list` query: `{ value: id, label: name, icon: <Icon /> }` (icon uses project logo)
- On submit, `projectIds` passed in mutation input
- Invalidations: add `projects.list`

### 5. ItemInfoPanel (`apps/web/src/pages/dashboard/stacks/stacks-page.tsx`)

After dependencies section, add projects section:

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

### 6. Error Handling

- **Invalid project IDs**: Repository validates existence before inserting. Returns typed error with invalid IDs.
- **Empty `projectIds` array**: Treated as "remove all links". Omit field to preserve existing links.
- **Concurrent edits**: Single-user app, last-write-wins on junction table.
- **Stack/project deletion**: Already cascades via FK. No changes.
- **Merge**: Already moves junction rows. No changes.
- **Optimistic UI**: Add `projects.list` to invalidation list.

## Files to Modify

1. `packages/core/src/stack/types.ts` — schemas
2. `packages/db/src/repositories/stack.repository.ts` — repo methods
3. `packages/api/src/routers/stacks.router.ts` — router handlers
4. `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx` — form field
5. `apps/web/src/pages/dashboard/stacks/stacks-page.tsx` — info panel

## Out of Scope

- Removing `projectIds` from project form (both sides stay available)
- Batch operations on project-stack links
- Filtering stacks by project in the stack list
