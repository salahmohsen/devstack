# Detect tech stacks from package.json via Mastra workflow

Auto-detect tech stacks from GitHub repositories' `package.json` files
using a Mastra workflow, triggered from the Project Form. Adds `type`
and `npmPackage` columns to the `stack` table for categorization and
deduplication. Includes 10 enhancements spanning auto-icon mapping,
health metadata, confidence scoring, stack aliases, usage frequency,
stack diff, batch detection, language aggregation, auto-descriptions,
and a portfolio tech stack section.

## Schema changes

### stack table — new columns

- `type` — one of `framework | language | database | ui | auth |
deployment | testing | ai | tooling | storage | other`. Assigned by
  the LLM during auto-detection, editable by the user.
- `npm_package` — the raw npm package name as it appears in
  `package.json` (e.g., `"react"`, `"@tanstack/react-query"`). Unique
  constraint. Nullable — not every stack has an npm package (e.g.,
  "REST API", "Docker"). Deduplication key: one npm package maps to at
  most one stack.
- `suggested_icon` — the react-icons component name suggested by the
  LLM (e.g., `"SiReact"`). Nullable. Used as default when creating
  stacks; user can override via icon picker.
- `health_status` — cached npm health data: `deprecated`, `downloads`,
  `lastPublished`. Nullable. Refreshed on re-scan.
- `confidence` — the LLM's confidence in the type categorization:
  `high | medium | low`. Nullable. Displayed as a badge in review.

### New table: stack_alias

Maps multiple npm packages to the same stack. Prevents duplicates like
"React" and "React DOM".

```
stack_alias
├── id: text (PK)
├── stack_id: text (FK → stack.id, CASCADE)
├── npm_package: text (UNIQUE)
├── created_at: timestamp
└── updated_at: timestamp
```

### New table: project_stack_scan

Records each detection scan for diff support.

```
project_stack_scan
├── id: text (PK)
├── project_id: text (FK → project.id, CASCADE)
├── scanned_at: timestamp
├── detected_packages: text[] (npm package names found)
└── detected_stack_ids: text[] (stack IDs associated)
```

## Button placement

The "Detect Stacks" button lives in the **Project Form** (not the
Stacks Dashboard page) because:

- Projects already have a `repos` field — the repos to scan are known
- The stack-to-project association is immediate and contextual
- Avoids scanning all user repos when only one project matters

Button only appears when the project has at least one repo selected.

## Review flow

The workflow returns all detected stacks (existing + new). The review
dialog shows:

- **Existing stacks** — unchecked (already in DB, user can associate
  them with the project if desired)
- **New stacks** — checked by default (candidates for creation)
- **Grouped by repo** — each repo's detected stacks shown under its
  heading
- **Health badges** — `⚠️ deprecated`, `📦 1.2M weekly`, `📅 3mo ago`
- **Confidence badges** — low-confidence items get a warning
- **Suggested icons** — preview next to each stack name
- **Stack diff** — on re-scan, shows new (green), unchanged (gray),
  removed (red) since last scan

User reviews, picks which to add, clicks "Add Selected". Checked items
get created as new Stack rows (with `npmPackage`, `type`, `suggestedIcon`
filled) and associated with the project. Unchecked existing stacks get
associated without creation.

Chosen over: auto-add all (risky junk), skip-existing (hides context).

## Workflow trigger

oRPC route in `agent.router.ts` proxies to the Mastra agent worker's
`POST /api/workflows/detect-stacks-workflow/stream` endpoint. The stream
emits `workflow-step-start` events that the UI tracks for real-time
`ShimmeringText` step progress.

Chosen over: server function (would block on LLM), agent chat route
(overkill).

## Workflow steps

1. **fetch-repo-package-jsons** — For each repo URL: parse owner/repo,
   read root `package.json`, read `pnpm-workspace.yaml` if present,
   resolve workspace globs, read each workspace `package.json`.
2. **extract-dependencies** — Merge all `dependencies` +
   `devDependencies` from all package.json files. Filter noise
   (`@types/*`, internal packages). Query npm registry for health
   metadata (deprecated, downloads, lastPublished) per package.
3. **categorize-with-llm** — LLM assigns a stack type and confidence
   level to each dependency using the defined taxonomy. Also suggests
   a react-icons component name and generates a short description.
4. **deduplicate-and-format** — Deduplicate by npm package name (check
   both `stack.npm_package` and `stack_alias.npm_package`). Mark
   existing stacks. Compute stack diff against last scan. Group by
   repo. Return structured result.

## Enhancements

### 1. Auto-icon mapping

The LLM suggests a `react-icons` component name (e.g., `"SiReact"`)
for each stack. The icon system already has ~4896 icons across 15
groups. The review dialog shows the icon preview. User can override
via the existing icon picker in `stack-form.tsx`.

### 2. Stack health metadata

For each detected npm package, the workflow queries the npm registry:

- `deprecated` field — is the package deprecated?
- `time[version]` — last publish date
- `downloads` — weekly download count (from npm API)

Show as badges in the review dialog. Stored in `stack.health_status`
for reuse.

### 3. Confidence scoring

The LLM returns `confidence: "high" | "medium" | "low"` for each
categorization. Low-confidence items get a warning badge in the review
dialog. Helps the user catch misclassifications.

### 4. Stack aliases

Multiple npm packages map to the same stack via `stack_alias` table.
E.g., `react` and `react-dom` both map to "React". The workflow checks
both `stack.npm_package` and `stack_alias.npm_package` when
deduplicating. Prevents duplicate stacks.

### 5. Usage frequency

Count how many projects use each stack via `project_stack` join.
Show on stack cards as `3 projects`. Sort review dialog by frequency
— most-used stacks first. Helps prioritize.

### 6. Stack diff on re-scan

When re-detecting stacks for a project, compare against the last scan
(`project_stack_scan`). Show:

- **New** (green) — packages found this time but not last time
- **Unchanged** (gray) — packages found both times
- **Removed** (red) — packages found last time but not this time

Record each scan in `project_stack_scan` for future diffs.

### 7. Batch detection

Add a "Detect All" button on the Stacks Dashboard page that runs the
workflow for every project with repos. Aggregates all detected stacks
across the entire portfolio in one go.

### 8. Language aggregation

Aggregate `language` from `GitHubUserRepoSummary` across a project's
repos. Show language breakdown on the project page:
`TypeScript 60% | CSS 25% | HTML 15%`. Use existing `languageColors`
map (expanded with GitHub's full language color palette).

### 9. Auto-descriptions

The LLM generates a short description for each new stack (e.g.,
"React — A JavaScript library for building user interfaces"). Fills
the `description` field automatically. User can edit later in
`stack-form.tsx`.

### 10. Portfolio tech stack section

A dedicated "Tech Stack" section on the public portfolio page (`/`)
showing all opted-in stacks with icons, descriptions, and project
counts. Currently stacks only appear as small badges inside project
cards.

## Monorepo support

The workflow reads `pnpm-workspace.yaml` to discover workspace globs
(e.g., `packages/*`, `apps/*`) and reads each workspace's
`package.json`. This ensures monorepo dependencies across all packages
are detected, not just the root.
