# Refactor: Organize Stacks Workflow into Folder Structure + Deduplicate Core Types

## Context

The organize-stacks workflow is a 725-line monolith in a single file. Two web app files redeclare `OrganizeAction` locally instead of importing from `@tsu-stack/core`. This refactor splits the workflow into a dedicated folder and eliminates type duplication.

## Changes

### 1. New folder structure

```
apps/agent/src/mastra/workflows/organize-stacks-workflow/
  index.ts
  organize-stacks-workflow.schema.ts
  find-merges.step.ts
  find-renames.step.ts
  find-enrichments.step.ts
  fetch-missing-icons.step.ts
  sort-stacks.step.ts
  format-output.step.ts
```

### 2. File responsibilities

**`organize-stacks-workflow.schema.ts`** — workflow-internal step schemas only:

- `StackSchema` (derived from `OrganizeStacksInputSchema.shape.stacks`)
- `MergeActionSchema`
- `RenameActionSchema`
- `EnrichActionSchema`

**Each `*.step.ts`** — exports a single `createStep(...)`:

- Imports schemas from `./organize-stacks-workflow.schema`
- Imports shared types from `@tsu-stack/core` as needed

**`index.ts`** — orchestrator:

- Imports all steps from `./find-merges.step`, `./find-renames.step`, etc.
- Creates workflow with `.then()` chain
- Calls `.commit()`
- Exports `organizeStacksWorkflow`

### 3. Import path

`apps/agent/src/mastra/index.ts` import unchanged — Vite resolves folder `index.ts`:

```
from "#@/mastra/workflows/organize-stacks-workflow"
```

### 4. Delete old file

Remove `apps/agent/src/mastra/workflows/organize-stacks-workflow.ts` (the flat file).

### 5. Fix web app type duplication

**`apps/web/src/pages/dashboard/stacks/ui/organize-dialog.tsx`:**

- Delete local `type OrganizeAction` (lines 28-34)
- Add import: `import { type OrganizeAction } from "@tsu-stack/core"`

**`apps/web/src/pages/dashboard/stacks/stacks-page.tsx`:**

- Replace inline type for `organizeActions` state (lines 79-86) with `OrganizeAction[]`
- Add import: `import { type OrganizeAction } from "@tsu-stack/core"`

## Verification

1. `pnpm -C apps/agent build` — workflow imports resolve
2. `pnpm -C apps/web build` — web types resolve
3. `pnpm typecheck` — no type errors across monorepo
