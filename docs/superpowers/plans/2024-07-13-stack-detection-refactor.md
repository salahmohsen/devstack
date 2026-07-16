# Stack Detection & Schema Refactor — Implementation Plan

**refresh-dependencies-workflow:** DEPRECATED

## Context

The current stack detection AI feature has several issues:

- LLM categorizes dependencies blind (no awareness of existing stacks)
- `PACKAGE_FAMILIES` map is static and hardcoded
- `npmPackage` on stack table creates confusion and enables a fragile alias-creation pattern in merge logic
- Icons split across `icon`, `suggestedIcon`, `iconSvg` columns
- Alias concept in merge logic creates unnecessary complexity

**Previous work completed:** `stack_alias` table removed, `stack_dependency` created, `contact.id` used as portfolio entityId, `ai_visibility` removed.

This refactor simplifies the architecture: programmatic matching first, AI only for unknowns, clean schema.

## Goals

1. Remove `npmPackage` from `stack` table — stack is identified by name + type; npm packages live only in `stack_dependency`
2. Make `stack_dependency.npm_package` globally unique (one package = one stack)
3. Add npm metadata to `stack_dependency` (description, version, homepage, downloads)
4. Remove `suggestedIcon` and `iconSvg` from stack — `icon` stores SVG directly
5. Rewrite detection workflow: programmatic match → AI categorize (unknowns only)
6. Add oRPC endpoint for npm search (autocomplete + metadata)
7. Add Mastra schedule for periodic refresh (dependencies older than 3 days)
8. Update frontend: stack form, detection dialog, icon rendering
9. Update organize workflow for new schema

## Architecture

### New Detection Flow

```
package.json parsed
    │
    ▼
┌─────────────────────────┐
│ 1. EXTRACT dependencies │
│    from package.json    │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 2. PROGRAMMATIC MATCH   │
│    Check stack_dep table│
│    found → attach stack │
│    not found → unknown  │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 3. AI CATEGORIZE        │
│    (unknowns only)      │
│    one-by-one           │
│    Sees: existing stacks│
│    + their dependencies │
│    Output: type, name,  │
│    confidence, icon,    │
│    description          │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 4. RETURN to frontend   │
│    User confirms/edits  │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 5. UPDATE DB            │
│    - new stacks created │
│    - stack_dep updated  │
│    - project linked     │
└─────────────────────────┘
```

### Schema Changes

#### `stack` table

```diff
- npmPackage: text
- suggestedIcon: text
- iconSvg: text
+ icon: text (stores SVG directly)
```

#### `stack_dependency` table

```diff
- UNIQUE (stack_id, npm_package)
+ UNIQUE (npm_package)
+ description: text
+ version: text
+ homepage: text
+ monthlyDownloads: integer
+ lastRefreshedAt: timestamp
```

### API Changes

#### New endpoint: `stacks.searchNpm`

- Proxy to npm registry search API
- Returns: name, description, version, keywords, links, downloads
- Used by: frontend autocomplete + workflow metadata fetch

#### New workflow: `refreshDependencies`

- Mastra schedule: daily at 3 AM
- Refreshes dependencies older than 3 days
- Fetches updated metadata from npm

### Frontend Changes

#### Stack form

- Add/remove dependencies with npm autocomplete
- Update icon (SVG)

#### Detection dialog

- Stream matched packages immediately
- Show AI results in batch
- User confirms/edits before DB update

#### Icon component

- `icon` field = SVG string (single source of truth)
- Remove react-icons lazy loading (Tier 1)
- Keep inline SVG rendering (Tier 2)
- Keep letter fallback (Tier 3)

### Organize Workflow Changes

#### Remove references to deleted fields

- `npmPackage` — remove from LLM prompts and merge grouping
- `suggestedIcon` — remove from enrichment candidate filter
- `iconSvg` — remove from fetchIconSvgs candidate filter

#### Redesign `fetchIconSvgs` step

- Current: Fetches SVGs for stacks with react-icons name but no `iconSvg`
- New: Fetch SVGs for stacks with no `icon` or react-icons name (not SVG)
- Produce `enrich` actions that set `icon` to SVG content

## Tasks

### Task 1: Schema Changes

Files:

- `packages/db/src/schema/stack.schema.ts` — remove `npmPackage`, `suggestedIcon`, `iconSvg` columns and their unique index; keep `icon`
- `packages/db/src/schema/stack-dependency.schema.ts` — add metadata columns, change unique constraint to `npm_package` only
- `packages/db/src/types/stack.schema.ts` — update `CreateStackData` and `UpdateStackData` (removed fields flow through automatically via `$inferInsert`)
- `packages/db/src/types/stack-dependency.schema.ts` — add metadata fields to inferred types
- `packages/core/src/stack/types.ts` — remove `npmPackage`, `suggestedIcon`, `iconSvg` from `StackOutputSchema`, `StackCreateInputSchema`, `StackUpdateInputSchema`
- `packages/core/src/stack/detect-stacks.types.ts` — remove `npmPackage`, `suggestedIcon`, `iconSvg` from `DetectedStackSchema` and `DetectStacksWorkflowInputSchema.existingStacks`
- `packages/core/src/stack/organize-stacks.types.ts` — remove `npmPackage`, `suggestedIcon`, `iconSvg` from input schema; remove `newIconSvg` from action details

Steps:

1. Remove `npmPackage`, `suggestedIcon`, `iconSvg` from `stack` table
2. Remove `uniqueIndex("stack_npm_package_unique_idx")` from `stack` table
3. Add metadata columns to `stack_dependency` table: `description`, `version`, `homepage`, `monthlyDownloads`, `lastRefreshedAt`
4. Change unique constraint on `stack_dependency` to `npm_package` only (replace composite unique with single-column unique)
5. Update types — should flow through from schema via `$inferInsert`/`$inferSelect`
6. Update core type files (see files list above)

### Task 2: Migration

Files:

- `packages/db/drizzle/` — new migration file generated by `drizzle-kit generate`

Steps:

1. Check if `20260713181000_create_stack_dependency` is applied (`drizzle-kit studio` or check `_journal` table)
2. If unapplied: delete the migration file, regenerate from updated schema with `drizzle-kit generate`
3. If applied: write a new migration (`drizzle-kit generate`) that:
   - **Deduplicates `npm_package`**: Before applying the unique constraint, delete duplicate `stack_dependency` rows where `npm_package` is the same — keep the row with the oldest `created_at` per `npm_package` value
   - Adds metadata columns to `stack_dependency`
   - Drops `npmPackage`, `suggestedIcon`, `iconSvg` columns and their index from `stack`
   - Changes unique constraint on `stack_dependency` to `npm_package` only
4. Do NOT manually edit committed migration files

**Dedup logic** (run as raw SQL in the migration or pre-migration step):

```sql
-- Delete duplicate stack_dependency rows, keeping oldest per npm_package
DELETE FROM stack_dependency
WHERE id NOT IN (
  SELECT DISTINCT ON (npm_package) id
  FROM stack_dependency
  ORDER BY npm_package, created_at ASC
);
```

### Task 3: Rewrite merge / batchMerge in `stack.repository.ts`

File: `packages/db/src/repositories/stack.repository.ts`

Both `merge` (lines 252-345) and `batchMerge` (lines 347-448) use `victim.npmPackage` to create alias entries in `stack_dependency` (lines 325-335, 425-435). After removing `npmPackage` from stack, this breaks. Changes required:

**Remove from both methods:**

- Lines that add `survivor.npmPackage` to `survivorAliasSet` (lines 312, 412) — `npmPackage` no longer exists on stack
- The "Create victim.npmPackage → survivor alias" block (lines 325-335, 425-435) — this was the alias concept; with `npm_package` globally unique on `stack_dependency`, victim's packages are already transferred or deduplicated in the dependency-move step above

**Keep unchanged:**

- `project_stack` link reassignment (survivor wins, duplicates deleted)
- `stack_dependency` row reassignment with dedup (survivor wins, duplicates deleted)

The `aliases` return field in both methods should be removed (no longer created).

### Task 4: oRPC npm Search Endpoint

Files:

- `packages/api/src/routers/stacks.router.ts` — add `searchNpm` procedure
- `packages/api/src/routers/portfolio.mappers.ts` — remove `npmPackage`, `suggestedIcon`, `iconSvg` from `StackRow` type and `toStackOutput()` mapping

Steps:

1. Create `stacks.searchNpm` endpoint
2. Proxy to npm registry API
3. Return structured metadata
4. Update portfolio mappers to remove deleted fields

### Task 5: Rewrite Detection Workflow

Files:

- `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts` — rewrite workflow steps
- `packages/core/src/stack/group-dependencies.ts` — delete file
- `packages/core/src/stack/index.ts` — remove `export * from "#@/stack/group-dependencies"` (line 6)
- `apps/agent/src/mastra/agents/stack-categorizer-agent.ts` — update agent instructions (remove `npmPackage`, `suggestedIcon`, `iconSvg`; add `icon` as SVG)
- `packages/api/src/routers/agent.router.ts` — update workflow invocation (remove deleted fields from mappings)

Steps:

1. Remove `groupDependencies` and `PACKAGE_FAMILIES` from workflow
2. Delete `packages/core/src/stack/group-dependencies.ts`
3. Remove the re-export from `packages/core/src/stack/index.ts`
4. Update import in `detect-stacks-workflow.ts` (line 7) — remove `groupDependencies` from the `@tsu-stack/core` import
5. Create `programmaticMatch` step
6. Create `aiCategorize` step (one-by-one)
7. Update `format` step
8. Wire frontend and oRPC
9. Update agent instructions
10. Update agent router mappings

### Task 6: Update Frontend

Files:

- `apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx` — stack form: add/remove dependencies, update icon; remove `npmPackage`, `iconSvg` references
- `apps/web/src/pages/dashboard/projects/ui/detect-stacks-dialog.tsx` — detection dialog: stream matched packages immediately, batch AI results for display; remove `suggestedIcon`, `iconSvg` references; create `upsertFromDetection` endpoint if missing
- `apps/web/src/shared/ui/icon.tsx` — update for SVG-only rendering (remove react-icons lazy loading Tier 1)

Steps:

1. Stack form: add/remove dependencies with npm autocomplete
2. Detection dialog: stream matched packages immediately; AI results are processed sequentially by the workflow but delivered to the dialog as a batch for display (not streamed one-by-one)
3. Icon component: update for SVG-only rendering
4. Create `stacks.upsertFromDetection` endpoint if missing
5. Update all frontend field references

### Task 7: Organize Workflow Update

Files:

- `apps/agent/src/mastra/workflows/organize-stacks-workflow.ts` — update workflow steps

Steps:

1. Remove `npmPackage` from LLM prompts (lines 259, 382)
2. Remove `npmPackage` from merge grouping logic (line 142)
3. Remove `suggestedIcon` from enrichment candidate filter (line 362)
4. Remove `iconSvg` from fetchIconSvgs candidate filter (line 494)
5. Redesign `fetchIconSvgs` step to work with `icon` storing SVG directly
6. Update step descriptions

### Task 8: Refresh Schedule

Files:

- `apps/agent/src/mastra/workflows/refresh-dependencies-workflow.ts` — new workflow
- `apps/agent/src/mastra/index.ts` — register workflow + schedule

Steps:

1. Create `refreshDependencies` workflow
2. Register in `apps/agent/src/mastra/index.ts`
3. Add Mastra schedule (daily at 3 AM)
4. Refresh dependencies older than 3 days

### Task 9: Verification

Runs after all other tasks (1–8) are complete.

Steps:

1. Run lint/typecheck across all affected packages
2. Test detection flow end-to-end
3. Test refresh schedule fires correctly
4. Verify merge/batchMerge works without `npmPackage`
5. Verify frontend renders correctly with new schema
6. Manual QA of full detection → confirm → DB update flow
7. Verify organize workflow works with new schema

## Dependencies

- Task 1 → Task 2 (schema before migration)
- Task 1 → Task 3 (schema before merge rewrite)
- Task 1 → Task 4 (schema before oRPC endpoint)
- Task 1 → Task 5 (schema before workflow refactor)
- Task 1 → Task 7 (schema before organize workflow)
- Task 1 → Task 8 (schema before refresh)
- Task 3 → Task 5 (merge safe before workflow refactor)
- Task 3 → Task 6 (merge rewrite safe before frontend — frontend consumes merge results)
- Task 3 → Task 7 (merge rewrite safe before organize — organize uses merge logic)
- Task 3 → Task 8 (merge rewrite safe before refresh — refresh reuses merge/batchMerge logic)
- Task 4 → Task 5 (oRPC endpoint before workflow)
- Task 4 → Task 6 (oRPC endpoint before frontend — frontend uses npm search)
- Task 5 → Task 6 (workflow before frontend)
- Task 5 → Task 8 (workflow before refresh — refresh reuses detection patterns)
- Task 9 → all tasks (verification runs after implementation is complete)

## Risk Mitigation

- **Data loss**: `npmPackage` removal is safe (personal project, can re-detect)
- **Migration**: Never modify committed migrations — regenerate or append
- **Merge correctness**: Removing alias-creation block is safe because `npm_package` globally unique on `stack_dependency` means victim's packages are already captured in dependency rows
- **AI accuracy**: Programmatic matching handles 90%+ of packages
- **Hallucination**: Input-anchored validation rejects invented packages
