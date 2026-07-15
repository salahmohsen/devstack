# Refactor: Detect Stacks Workflow into Folder Structure

## Context

The detect-stacks workflow is an 861-line monolith with 7 steps, utility functions, internal types, and constants. This refactor splits it into a dedicated folder following the same pattern used for organize-stacks-workflow.

## Changes

### 1. New folder structure

```
apps/agent/src/mastra/workflows/detect-stacks-workflow/
  index.ts
  detect-stacks-workflow.schema.ts
  utils.ts
  fetch-repo-package-jsons.step.ts
  extract-dependencies.step.ts
  programmatic-match.step.ts
  ai-categorize.step.ts
  deduplicate-groups.step.ts
  resolve-icons.step.ts
  format.step.ts
```

### 2. File responsibilities

**`detect-stacks-workflow.schema.ts`** — workflow-internal step schemas:

- `batchOutputSchema`
- `categorizedEntrySchema`

**`utils.ts`** — shared helpers, constants, and types:

- `NOISE_PATTERNS` constant + `isNoisePackage()`
- `isWorkspaceProtocol()`
- `parsePackageJson()`
- `extractDepsFromPackageJson()`
- `BATCH_CHUNK_SIZE`, `BATCH_TIMEOUT_MS` constants
- `ExtractedDep`, `CategorizedEntry`, `InitData` types

**Each `*.step.ts`** — exports a single `createStep(...)`:

- Imports schemas from `./detect-stacks-workflow.schema`
- Imports utils from `./utils`
- Imports shared types from `@tsu-stack/core` as needed

**`index.ts`** — orchestrator:

- Imports all steps
- Creates workflow with `.then()` chain
- Calls `.commit()`
- Exports `detectStacksWorkflow`

### 3. Import path

`apps/agent/src/mastra/index.ts` import unchanged:

```
from "#@/mastra/workflows/detect-stacks-workflow"
```

### 4. Delete old file

Remove `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts`.

### 5. No web app changes needed

`DetectStacksOutput` is not redeclared locally in any web app file.

## Verification

1. `npx tsc --noEmit -p apps/agent/tsconfig.json` — no new errors
2. `ls` old file gone + folder structure correct
