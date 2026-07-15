# Implementation Plan: Detect Stacks from package.json

## Overview

Add a Mastra workflow that auto-detects tech stacks from GitHub repos'
`package.json` files. Triggered from the Project Form, streams step
progress to the UI, shows a review dialog with health/confidence/icon
metadata, and creates Stack entries on confirmation. Includes 10
enhancements: auto-icon, health metadata, confidence scoring, stack
aliases, usage frequency, stack diff, batch detection, language
aggregation, auto-descriptions, and portfolio tech section.

---

## Phase 1: Database Schema Changes

### Step 1.1: Add columns to `stack` table

**File:** `packages/db/src/schema/stack.schema.ts`

Add `json` to the `drizzle-orm/pg-core` import (if not already present).

Add 6 new nullable columns after `icon`:

```ts
npmPackage: text("npm_package"),           // unique, nullable
type: text("type"),                        // nullable, enum-like via Zod
suggestedIcon: text("suggested_icon"),     // nullable, react-icons component name
iconSvg: text("icon_svg"),                // nullable, inline SVG for custom icons
healthStatus: json("health_status").$type<{ deprecated?: boolean; downloads?: number; lastPublished?: string }>(),
confidence: text("confidence"),            // nullable: "high"|"medium"|"low"
```

Add unique index on `npmPackage`:

```ts
uniqueIndex("stack_npm_package_unique_idx").on(table.npmPackage);
```

### Step 1.2: Create `stack_alias` table

**New file:** `packages/db/src/schema/stack-alias.schema.ts`

```ts
stackAlias = pgTable(
  "stack_alias",
  {
    id: text("id").primaryKey(),
    stackId: text("stack_id")
      .notNull()
      .references(() => stack.id, { onDelete: "cascade" }),
    npmPackage: text("npm_package").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("stack_alias_npm_package_unique_idx").on(table.npmPackage),
    index("stack_alias_stack_id_idx").on(table.stackId)
  ]
);
```

### Step 1.3: Create `project_stack_scan` table

**New file:** `packages/db/src/schema/project-stack-scan.schema.ts`

```ts
projectStackScan = pgTable(
  "project_stack_scan",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    runId: text("run_id"), // Mastra workflow run ID for tracing
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
    detectedPackages: text("detected_packages").array(),
    detectedStackIds: text("detected_stack_ids").array()
  },
  (table) => [index("project_stack_scan_project_id_idx").on(table.projectId)]
);
```

### Step 1.4: Add relations

**File:** `packages/db/src/schema/relations.ts`

Add to `stack` relations:

```ts
aliases: r.many.stackAlias({
  from: r.stack.id,
  to: r.stackAlias.stackId
});
```

Add new `stackAlias` relations:

```ts
stackAlias: {
  stack: r.one.stack({
    from: r.stackAlias.stackId,
    to: r.stack.id
  });
}
```

Add new `projectStackScan` relations:

```ts
projectStackScan: {
  project: r.one.project({
    from: r.projectStackScan.projectId,
    to: r.project.id
  });
}
```

### Step 1.5: Update barrel exports

**File:** `packages/db/src/schema/index.ts` — add exports for new schema files
**File:** `packages/db/src/types/` — add type files for new tables

### Step 1.6: Generate migration

Run `pnpm db:generate` from `packages/db/` to create the migration.

---

## Phase 2: Core Types Update

### Step 2.1: Update stack types

**File:** `packages/core/src/stack/types.ts`

Update `StackOutputSchema` to include new fields:

```ts
npmPackage: z.string().nullable().describe("npm package name for auto-detection dedup"),
type: z.string().nullable().describe("Stack type: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | other"),
suggestedIcon: z.string().nullable().describe("react-icons component name (e.g., SiReact)"),
iconSvg: z.string().nullable().describe("Inline SVG for custom icons not in react-icons"),
healthStatus: z.object({
  deprecated: z.boolean().optional(),
  downloads: z.number().optional(),
  lastPublished: z.string().optional()
}).nullable().describe("Cached npm registry health metadata"),
confidence: z.enum(["high", "medium", "low"]).nullable().describe("LLM categorization confidence"),
```

Update `StackCreateInputSchema` (only user-settable fields — `healthStatus` and `confidence` are workflow-computed). The `satisfies` constraint must also exclude these two fields:

```ts
// satisfies z.ZodType<Partial<Omit<StackSchemaInsert, "id" | "createdAt" | "updatedAt" | "sortOrder" | "portfolioEntryId" | "healthStatus" | "confidence">>>
npmPackage: z.string().nullable().optional().describe("npm package name"),
type: z.string().nullable().optional().describe("Stack type category"),
suggestedIcon: z.string().nullable().optional().describe("react-icons component name"),
iconSvg: z.string().nullable().optional().describe("Inline SVG for custom icons"),
```

Update `StackUpdateInputSchema` similarly (same 4 fields only).

### Step 2.2: Create detect-stacks types

**New file:** `packages/core/src/stack/detect-stacks.types.ts`

Two schemas: `DetectStacksClientInputSchema` (what the oRPC handler receives from the client) and `DetectStacksWorkflowInputSchema` (what the workflow actually receives after the oRPC handler pre-fetches data).

```ts
// What the client sends (just projectId + repos)
export const DetectStacksClientInputSchema = z.object({
  projectId: z.string().describe("The project ID to detect stacks for"),
  repos: z.array(z.string().url()).describe("GitHub repository URLs to scan")
});

// What the workflow receives (enriched by oRPC handler with pre-fetched data)
export const DetectStacksWorkflowInputSchema = z.object({
  projectId: z.string().describe("The project ID being scanned"),
  repoPackages: z
    .array(
      z.object({
        repo: z.string().describe("Repository URL"),
        rootPkgContent: z
          .string()
          .nullable()
          .describe("Raw JSON content of root package.json, null if not found"),
        workspaceYamlContent: z
          .string()
          .nullable()
          .describe("Raw content of pnpm-workspace.yaml, null if not monorepo"),
        workspacePkgContents: z.array(
          z.object({
            workspace: z.string().describe("Workspace glob pattern or name"),
            content: z.string().describe("Raw JSON content of workspace package.json")
          })
        )
      })
    )
    .describe("Pre-fetched package.json content from each repository"),
  existingStacks: z
    .array(
      z.object({
        id: z.string().describe("Existing stack ID in database"),
        npmPackage: z.string().nullable().describe("npm package name if already set"),
        name: z.string().describe("Display name of existing stack")
      })
    )
    .describe("Stacks already in the database (for deduplication)"),
  existingAliases: z
    .array(
      z.object({
        npmPackage: z.string().describe("npm package name that aliases to a stack"),
        stackId: z.string().describe("The stack ID this alias points to")
      })
    )
    .describe("Existing npm package aliases (for deduplication)"),
  lastScan: z
    .object({
      detectedPackages: z.array(z.string()).describe("npm packages from previous scan")
    })
    .nullable()
    .describe("Previous scan result for diff, null if first scan")
});

export const DetectedStackSchema = z.object({
  npmPackage: z.string().describe("npm package name (e.g., 'react', 'tailwindcss')"),
  name: z.string().describe("Human-readable display name (e.g., 'React', 'Tailwind CSS')"),
  type: z
    .string()
    .describe(
      "Stack type category: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | other"
    ),
  description: z
    .string()
    .nullable()
    .describe("One-sentence description of what this dependency does"),
  suggestedIcon: z
    .string()
    .nullable()
    .describe("react-icons component name (e.g., 'SiReact'). Null if no match found."),
  iconSvg: z
    .string()
    .nullable()
    .describe(
      "Simple 24x24 SVG string using currentColor. Only set if no react-icons match exists. Single path element, stroke-based."
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "How confident you are in this categorization. High = well-known package with clear purpose. Medium = somewhat known or ambiguous. Low = uncertain."
    ),
  exists: z
    .boolean()
    .describe("Whether this stack already exists in the database (set by dedup step, not by LLM)"),
  existingStackId: z
    .string()
    .nullable()
    .describe("ID of existing stack if exists=true (set by dedup step)"),
  repo: z.string().describe("Which repository this dependency was found in"),
  health: z
    .object({
      deprecated: z.boolean().optional().describe("Whether the npm package is deprecated"),
      downloads: z.number().optional().describe("Weekly npm downloads"),
      lastPublished: z.string().optional().describe("ISO date of last publish")
    })
    .nullable()
    .describe("npm registry health metadata, null if not fetched")
});

export const DetectStacksOutputSchema = z.object({
  detectedStacks: z.array(DetectedStackSchema).describe("All detected stacks across all repos"),
  groupedByRepo: z
    .array(
      z.object({
        repo: z.string().describe("Repository URL"),
        stacks: z.array(DetectedStackSchema).describe("Stacks found in this repo")
      })
    )
    .describe("Stacks grouped by their source repository"),
  hasChanges: z.boolean().describe("Whether there are new or removed packages since last scan"),
  diff: z
    .object({
      added: z.array(z.string()).describe("npm packages found this time but not last time"),
      unchanged: z.array(z.string()).describe("npm packages found both times"),
      removed: z.array(z.string()).describe("npm packages found last time but not this time")
    })
    .nullable()
    .describe("Diff against previous scan, null if first scan")
});
```

### Step 2.3: Update barrel exports

**File:** `packages/core/src/stack/index.ts`

Add: `export * from "#@/stack/detect-stacks.types"`

---

## Phase 3: Repository Layer Updates

### Step 3.1: Update stack repository

**File:** `packages/db/src/repositories/stack.repository.ts`

Add methods:

- `findByNpmPackage(npmPackage: string)` — lookup by npm name
- `findByNpmPackageOrAlias(npmPackage: string)` — check both `stack.npmPackage` and `stackAlias.npmPackage`
- `findManyByNpmPackages(packages: string[])` — bulk lookup for dedup
- `createMany(stacks: CreateStackData[])` — bulk create for workflow results
- `getUsageCount(stackId: string)` — count projects using this stack via `projectStack`

### Step 3.2: Create stack alias repository

**New file:** `packages/db/src/repositories/stack-alias.repository.ts`

Methods:

- `findByNpmPackage(npmPackage: string)`
- `create(input: CreateStackAliasData)`
- `createMany(aliases: CreateStackAliasData[])`
- `findByStackId(stackId: string)`

### Step 3.3: Create project stack scan repository

**New file:** `packages/db/src/repositories/project-stack-scan.repository.ts`

Methods:

- `findLatestByProjectId(projectId: string)` — last scan for diff
- `create(input: CreateProjectStackScanData)`

### Step 3.4: Update portfolio mapper

**File:** `packages/api/src/routers/portfolio.mappers.ts`

`StackRow` is manually typed and `toStackOutput` only maps existing fields. After adding 6 new columns to the `stack` table, the Zod schema will expect them but the mapper won't return them. Update:

1. Add `npmPackage`, `type`, `suggestedIcon`, `iconSvg`, `healthStatus`, `confidence` to `StackRow` type
2. Add these fields to `toStackOutput` mapping

Or replace `StackRow` with `InferSelectModel<typeof stack>` from Drizzle so it auto-extends.

### Step 3.5: Update barrel exports

**File:** `packages/db/src/repositories/index.ts` — add new repository exports

---

## Phase 4: API Layer Updates

### Step 4.1: Update stacks router

**File:** `packages/api/src/routers/stacks.router.ts`

Add procedures:

- `usageCount` — `protectedProcedure`, input `{ id }`, returns `{ count: number }`
- `bulkCreate` — `protectedProcedure`, input `{ stacks: StackCreateInputSchema[] }`, returns created stacks

Update `list` to include `npmPackage`, `type`, `suggestedIcon`, `healthStatus`, `confidence` in output.

### Step 4.2: Add detect-stacks route to agent router

**File:** `packages/api/src/routers/agent.router.ts`

Add procedure:

```ts
detectStacks: ownerProcedure
  .route({ description: "Detect stacks from project repos via Mastra workflow", method: "POST" })
  .input(DetectStacksClientInputSchema) // { projectId, repos }
  .handler(async ({ input, context }) => {
    // 1. Pre-fetch all package.json contents using getRepoFileContent (cached)
    // 2. Look up existing stacks, aliases, last scan
    // 3. Build DetectStacksWorkflowInputSchema payload
    // 4. Hit agent worker: POST /api/workflows/detect-stacks-workflow/stream
    //    with { inputData: workflowInput }
    // 5. Forward upstream.body to streamToEventIterator
  });
```

The handler pre-fetches GitHub content in-process (has Octokit access
and caching), then streams the workflow result. The client must parse
Mastra's `data-workflow-step` parts from the stream to track step
progress. Each step part has `{ type: "data-workflow-step", data: { stepId, status } }`.

### Step 4.3: Add bulk create and alias procedures to stacks router

**File:** `packages/api/src/routers/stacks.router.ts`

Add procedures:

- `bulkCreate` — `protectedProcedure`, input `{ stacks: StackCreateInputSchema[] }`, creates multiple stacks in a transaction, returns created stacks with IDs
- `createAliases` — `protectedProcedure`, input `{ aliases: Array<{ stackId: string; npmPackage: string }> }`, creates stack aliases in bulk
- `createScan` — `protectedProcedure`, input `{ projectId, runId, detectedPackages: string[], detectedStackIds: string[] }`, records a scan result for diff tracking

### Step 4.4: Add language aggregation utility

**File:** `packages/api/src/routers/portfolio.queries.ts` or new utility

Add a function that aggregates languages from a project's repos.
Since repos are stored as URL strings and language data comes from the
GitHub API (not the DB), this is computed at query time:

```ts
async function aggregateProjectLanguages(
  repoUrls: string[],
  context: OrpcContext
): Promise<Array<{ name: string; percentage: number; color: string }>>;
```

This calls `getProfileRepos` to get language data, then groups by
language name and computes percentages.

### Step 4.5: Update project router output

**File:** `packages/api/src/routers/projects.router.ts`

Include language aggregation in project output when repos are present.

---

## Phase 5: Mastra Workflow

### Step 5.1: Create the workflow

**New file:** `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts`

#### Step 1: `fetch-repo-package-jsons`

```ts
const fetchRepoPackageJsons = createStep({
  id: "fetch-repo-package-jsons",
  description: "Parses pre-fetched package.json content into structured data",
  inputSchema: DetectStacksWorkflowInputSchema,
  outputSchema: z.object({
    repoPackages: z.array(
      z.object({
        repo: z.string(),
        rootPkg: z.any().nullable(),
        workspacePkgs: z.array(
          z.object({
            workspace: z.string(),
            pkg: z.any()
          })
        )
      })
    )
  }),
  execute: async ({ inputData }) => {
    // For each repoPackage in inputData.repoPackages:
    // 1. Parse rootPkgContent as JSON (handle parse errors gracefully)
    // 2. Parse workspaceYamlContent to get workspace globs
    // 3. Parse each workspacePkgContents entry
    // 4. Return structured result
    //
    // Error handling: if one repo fails, log warning and continue with
    // remaining repos. Return partial results.
  }
});
```

**Note:** The oRPC handler in `agent.router.ts` pre-fetches all GitHub
content before invoking the workflow. This step just parses the raw
strings into JSON objects. This avoids the agent worker needing GitHub
auth.

#### Step 2: `extract-dependencies`

```ts
const extractDependencies = createStep({
  id: "extract-dependencies",
  description: "Extracts and deduplicates dependencies from package.json files",
  inputSchema: fetchRepoPackageJsons.outputSchema, // { repoPackages: [...] }
  outputSchema: z.object({
    dependencies: z
      .array(
        z.object({
          name: z.string().describe("npm package name"),
          version: z.string().describe("Version specifier from package.json"),
          repo: z.string().describe("Source repository URL"),
          workspace: z.string().nullable().describe("Workspace name if monorepo, null for root")
        })
      )
      .describe("Deduplicated list of project dependencies")
  }),
  execute: async ({ inputData }) => {
    // 1. Parse each rootPkgContent as JSON
    // 2. Merge dependencies + devDependencies
    // 3. Filter noise: @types/*, internal workspace packages
    // 4. Resolve workspace globs from pnpm-workspace.yaml
    // 5. Parse each workspace package.json
    // 6. Merge all dependencies
    // 7. Deduplicate by package name
    //
    // Error handling: wrap parse operations in try/catch. If a repo's
    // JSON is malformed, log warning, skip that repo, continue.
  }
});
```

#### Step 3: `categorize-with-llm`

```ts
const categorizeWithLLM = createStep({
  id: "categorize-with-llm",
  description: "Uses LLM to categorize dependencies into stack types",
  inputSchema: extractDependencies.outputSchema, // { dependencies: [...] }
  outputSchema: z.object({
    stacks: z.array(
      z.object({
        npmPackage: z.string().describe("npm package name"),
        name: z.string().describe("Display name (e.g., 'React' not 'react')"),
        type: z
          .string()
          .describe(
            "Stack type: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | other"
          ),
        description: z.string().nullable().describe("One-sentence description"),
        suggestedIcon: z.string().nullable().describe("react-icons component name or null"),
        iconSvg: z
          .string()
          .nullable()
          .describe("24x24 SVG with currentColor, or null if react-icons has match"),
        confidence: z.enum(["high", "medium", "low"]).describe("Categorization confidence"),
        repo: z.string().describe("Source repository URL")
      })
    )
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("stackCategorizerAgent");
    // Send dependency list to agent with prompt:
    // "Categorize each dependency into stack types..."
    // Agent returns structured output via structuredOutput
    //
    // Error handling: if agent call fails or returns malformed output,
    // fall back to heuristic classification (keyword matching on
    // dependency names). Return partial results rather than crashing.
  }
});
```

#### Step 4: `deduplicate-and-format`

```ts
const deduplicateAndFormat = createStep({
  id: "deduplicate-and-format",
  description: "Deduplicates stacks, checks existing, computes diff",
  inputSchema: categorizeWithLLM.outputSchema, // only previous step's output
  outputSchema: DetectStacksOutputSchema,
  execute: async ({ inputData, getInitData }) => {
    const initData = getInitData(); // workflow input — has existingStacks, existingAliases, lastScan
    // 1. Deduplicate by npmPackage
    // 2. Check against initData.existingStacks and initData.existingAliases
    // 3. Mark exists=true/false, set existingStackId
    // 4. Compute diff against initData.lastScan
    // 5. Group by repo
    // 6. Return structured result
  }
});
```

#### Workflow composition:

```ts
const detectStacksWorkflow = createWorkflow({
  id: "detect-stacks-workflow",
  inputSchema: DetectStacksWorkflowInputSchema, // NOT the client input schema
  outputSchema: DetectStacksOutputSchema
})
  .then(fetchRepoPackageJsons)
  .then(extractDependencies)
  .then(categorizeWithLLM)
  .then(deduplicateAndFormat);

detectStacksWorkflow.commit();
```

### Step 5.2: Create the categorizer agent

**New file:** `apps/agent/src/mastra/agents/stack-categorizer-agent.ts`

```ts
export function createStackCategorizerAgent() {
  return new Agent({
    id: "stack-categorizer",
    name: "Stack Categorizer",
    instructions: `You categorize npm dependencies into tech stack types.
    
Types: framework, language, database, ui, auth, deployment, testing, 
ai, tooling, storage, other.

For each dependency, provide:
- npmPackage: the original npm package name (e.g., "react-dom")
- name: display name (e.g., "React" not "react")
- type: one of the types above
- repo: the source repository URL this dependency was found in
- description: one-sentence description
- suggestedIcon: react-icons component name (e.g., "SiReact") if available
- iconSvg: simple SVG string (24x24, single path) if no react-icons match exists. Use the package's logo or a generic icon for its type.
- confidence: high/medium/low

For iconSvg: keep it minimal — a single <path> element, stroke-based,
24x24 viewBox, currentColor for fill/stroke so it inherits text color.
Sanitize before returning (no scripts, no event handlers).

Skip: @types/*, internal workspace packages, build-only tools.

Use the get-npm-health tool to check package health when confidence
is medium or low, to improve accuracy.`,
    model: [
      { model: "opencode-go/minimax-m3", maxRetries: 1 },
      { model: "nvidia/meta/llama-3.3-70b-instruct", maxRetries: 2 }
    ]
  });
}
```

### Step 5.4: Register in Mastra index

**File:** `apps/agent/src/mastra/index.ts`

```ts
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";

export const mastra = new Mastra({
  workflows: { weatherWorkflow, detectStacksWorkflow },
  agents: {
    weatherAgent: createWeatherAgent(),
    stackCategorizerAgent: createStackCategorizerAgent()
  }
  // ... rest unchanged
});
```

---

## Phase 6: Frontend — Detect Stacks Button & Dialog

### Step 6.1: Install ShimmeringText

```bash
cd apps/web && npx shadcn@latest add @unlumen-ui/shimmering-text
```

### Step 6.2: Update Icon component for SVG fallback

**File:** `apps/web/src/shared/ui/icon.tsx`

Add support for inline SVG and letter fallback. The component now accepts an optional `iconSvg` prop and uses a 3-tier resolution:

```tsx
type IconProps = {
  nameIcon?: string | null;
  iconSvg?: string | null;
  propsIcon?: IconBaseProps;
  fallbackToLetter?: boolean; // show first letter if no icon found
  letterClassName?: string; // styling for letter fallback
};

function Icon({
  nameIcon,
  iconSvg,
  propsIcon,
  fallbackToLetter = false,
  letterClassName
}: IconProps) {
  const [Component, setComponent] = React.useState<IconType | null>(null);

  React.useEffect(() => {
    if (!nameIcon) return;
    let cancelled = false;
    void resolveIcon(nameIcon).then((comp) => {
      if (!cancelled) setComponent(() => comp);
    });
    return () => {
      cancelled = true;
    };
  }, [nameIcon]);

  // Tier 1: react-icons component
  if (Component) return <Component {...propsIcon} />;

  // Tier 2: inline SVG from DB
  if (iconSvg) {
    return (
      <span
        className={cn("inline-flex items-center justify-center", propsIcon?.className)}
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    );
  }

  // Tier 3: letter fallback
  if (fallbackToLetter && nameIcon) {
    return (
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md bg-muted text-sm font-medium",
          letterClassName
        )}
      >
        {nameIcon.charAt(0).toUpperCase()}
      </span>
    );
  }

  return null;
}
```

**Security note:** `iconSvg` is stored in the DB and set via `dangerouslySetInnerHTML`. Add a `sanitizeSvg()` utility in `packages/core/src/stack/sanitize-svg.ts` that strips `<script>`, `on*` event handlers, `<foreignObject>`, and `javascript:` URIs. Call it at these sites:

- `categorize-with-llm` step execute — after LLM returns `iconSvg`, before passing downstream
- Stack form `onSubmit` handler — before calling `stacks.bulkCreate()`
- `stacks.bulkCreate` procedure — defensive sanitize before DB insert

### Step 6.3: Create detect stacks API hook

**New file:** `apps/web/src/features/stacks/api/detect-stacks.ts`

```ts
export function useDetectStacksMutation() {
  return useMutation({
    mutationFn: async (input: { projectId: string; repos: string[] }) => {
      const stream = await orpcClient.agent.detectStacks(input);
      // Consume stream events to track step progress
      // Return final result
    }
  });
}
```

The hook streams workflow events and exposes:

- `currentStep` — which step is running (for ShimmeringText)
- `result` — the DetectStacksOutput when complete
- `isStreaming` — whether the workflow is running

### Step 6.4: Create detect stacks dialog

**New file:** `apps/web/src/pages/dashboard/projects/ui/detect-stacks-dialog.tsx`

**coss primitives used:**

- `Dialog` / `DialogPopup` / `DialogHeader` / `DialogPanel` / `DialogFooter`
- `Checkbox` for stack selection
- `Badge` for stack type and health
- `Button` for actions

**Structure:**

```
Dialog (controlled open)
  DialogPopup
    DialogHeader
      DialogTitle: "Detect Stacks"
      DialogDescription: "Review detected technologies from your repositories"

    // Loading state (while streaming):
    DialogPanel
      ShimmeringText cycling step phrases:
        "Fetching repository files…"
        "Extracting dependencies…"
        "Categorizing technologies…"
        "Preparing results…"

    // Results state (after streaming):
    DialogPanel (scrollable)
      For each repo group:
        Repo heading (name + link)
        For each stack in repo:
          Checkbox (checked for new, unchecked for existing)
          Icon preview (suggestedIcon or existing icon)
          Stack name (display name)
          Badge: type (framework, ui, etc.)
          Badge: confidence (if low, warning variant)
          Badge: health (deprecated/downloads/lastPublished)
          Badge: "already exists" (if exists, muted variant)

    DialogFooter
      Button "Add Selected" (primary, loading state)
      DialogClose "Cancel" (ghost)
```

### Step 6.5: Add button to project form

**File:** `apps/web/src/pages/dashboard/projects/ui/project-form.tsx`

After the `repos` field (line 249), add:

```tsx
{
  repos.length > 0 && (
    <Button
      variant="outline"
      type="button"
      onClick={() => setDetectDialogOpen(true)}
      disabled={detectStacksMutation.isPending}
    >
      Detect Stacks
    </Button>
  );
}
```

Add state for dialog open and render `DetectStacksDialog`.

### Step 6.6: Wire dialog result to form

When the user clicks "Add Selected" in the dialog:

1. Create new Stack rows via `orpcClient.stacks.bulkCreate()`
2. Create stack aliases via `orpcClient.stacks.createAliases()`
3. Record the scan via `orpcClient.stacks.createScan({ projectId, runId, detectedPackages, detectedStackIds })` — this procedure is defined in Step 4.3
4. Add selected stack IDs to the form's `stackIds` field
5. Invalidate stacks list and portfolio queries

---

## Phase 7: Stack Card Enhancements

### Step 7.1: Show type badge on stack cards

**File:** `apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx`

Below the stack name, add a small Badge showing the type:

```tsx
{
  stack.type && (
    <Badge variant="outline" size="sm">
      {stack.type}
    </Badge>
  );
}
```

### Step 7.2: Show usage count on stack cards

Add a small project count below the type badge:

```tsx
{
  usageCount > 0 && <span className="text-xs text-muted-foreground">{usageCount} projects</span>;
}
```

Requires fetching usage counts — either include in the `list` response
or prefetch on hover.

### Step 7.3: Update stack form with npmPackage field

**File:** `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx`

Add field after `name`:

```tsx
<form.AppField name="npmPackage">
  {(field) => (
    <field.InputField
      label="npm Package"
      placeholder="e.g. react, tailwindcss"
      description="Optional. The npm package name for auto-detection."
    />
  )}
</form.AppField>
```

Update defaultValues and mutation payloads.

---

## Phase 8: Language Aggregation

### Step 8.1: Add language aggregation to project output

**File:** `packages/api/src/routers/projects.router.ts` or `portfolio.mappers.ts`

When returning project data, if `repos` is non-empty, aggregate
languages from the GitHub API. Cache the result in the project's
response to avoid repeated API calls.

### Step 8.2: Show languages on project page

**File:** `apps/web/src/pages/dashboard/projects/ui/project-page.tsx`

In the info panel, after repos, show language breakdown:

```tsx
{
  project.languages?.map((lang) => (
    <Badge key={lang.name} variant="outline">
      <span className="size-2 rounded-full" style={{ backgroundColor: lang.color }} />
      {lang.name} {lang.percentage}%
    </Badge>
  ));
}
```

### Step 8.3: Expand language color map

**File:** `apps/web/src/shared/ui/repository-row.tsx`

Replace the hardcoded 11-language map with GitHub's full linguist
colors (available at
`https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml`).
Or use the `languageColor` from the API when available.

---

## Phase 9: Batch Detection

### Step 9.1: Add "Detect All" button to stacks dashboard

**File:** `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`

In the `PageHeader` actions, add a "Detect All" button (only when
there are projects with repos). Clicking it:

1. Fetches all projects with repos
2. Runs the detect-stacks workflow for each
3. Shows a progress indicator
4. Invalidates stacks list when complete

### Step 9.2: Add batch detect procedure

**File:** `packages/api/src/routers/agent.router.ts`

Add `detectStacksAll: ownerProcedure` that:

1. Lists all projects with non-empty repos
2. Runs the workflow for each project **in batches of 2**
   (avoids rate limits on free-tier LLM models)
3. Includes exponential backoff on rate-limit errors (1s, 2s, 4s)
4. Aggregates results, returns per-project status

---

## Phase 10: Portfolio Tech Stack Section

### Step 10.1: Create tech stacks section component

**New file:** `apps/web/src/pages/home-page/ui/tech-stacks-section.tsx`

Fetches opted-in stacks via `portfolio.list` (filter by type=stack),
renders them in a grid with:

- Icon (from stack.icon)
- Name
- Description (if available)
- Project count (how many portfolio projects use this stack)

### Step 10.2: Add to home page

**File:** `apps/web/src/pages/home-page/ui/home-page.tsx`

Add `<TechStacksSection />` after `<Experience />`.

---

## Phase 11: Stack Diff on Re-scan

### Step 11.1: Record scans

When the detect-stacks workflow completes and the user confirms,
record a `project_stack_scan` row with the detected packages and
resulting stack IDs.

### Step 11.2: Show diff in dialog

When the user clicks "Detect Stacks" on a project that has a previous
scan, the workflow input includes `lastScan`. The dedup step computes:

- **Added** (green badge) — packages found this time but not last time
- **Unchanged** (gray) — packages found both times
- **Removed** (red badge) — packages found last time but not this time

---

## Implementation Order

1. **Phase 1** — DB schema (foundation)
2. **Phase 2** — Core types (shared contracts)
3. **Phase 3** — Repository layer (data access)
4. **Phase 4** — API layer (routes + procedures)
5. **Phase 5** — Mastra workflow + agent (brain)
6. **Phase 6** — Frontend dialog + button (UI)
7. **Phase 7** — Stack card enhancements (polish)
8. **Phase 8** — Language aggregation (bonus)
9. **Phase 9** — Batch detection (power feature)
10. **Phase 10** — Portfolio tech section (public display)
11. **Phase 11** — Stack diff (re-scan intelligence)

Phases 1-6 are the critical path. Phases 7-11 can be done in parallel
or deferred.

---

## Key Files Reference

| File                                                                  | Purpose                         |
| --------------------------------------------------------------------- | ------------------------------- |
| `packages/db/src/schema/stack.schema.ts`                              | Stack table definition          |
| `packages/db/src/schema/project.schema.ts`                            | Project + projectStack tables   |
| `packages/db/src/schema/relations.ts`                                 | All entity relations            |
| `packages/db/src/repositories/stack.repository.ts`                    | Stack data access               |
| `packages/db/src/repositories/project.repository.ts`                  | Project data access             |
| `packages/core/src/stack/types.ts`                                    | Stack Zod schemas + types       |
| `packages/api/src/routers/stacks.router.ts`                           | Stack CRUD procedures           |
| `packages/api/src/routers/agent.router.ts`                            | Agent/workflow proxy            |
| `packages/api/src/routers/portfolio.mappers.ts`                       | Stack output mapper             |
| `packages/github/src/repo/repo-file-content/get-repo-file-content.ts` | GitHub file reader              |
| `apps/agent/src/mastra/index.ts`                                      | Mastra registration             |
| `apps/agent/src/mastra/workflows/weather-workflow.ts`                 | Workflow pattern reference      |
| `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`                 | Stacks dashboard                |
| `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx`               | Stack create/edit form          |
| `apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx`               | Stack card component            |
| `apps/web/src/pages/dashboard/projects/ui/project-form.tsx`           | Project form (button goes here) |
| `apps/web/src/pages/dashboard/projects/ui/project-page.tsx`           | Project detail page             |
| `apps/web/src/pages/home-page/ui/projects-section.tsx`                | Public projects display         |
| `apps/web/src/shared/ui/icon.tsx`                                     | Icon rendering system           |
| `apps/web/src/shared/ui/icons-data.ts`                                | Icon registry (~4896 icons)     |
| `packages/api/src/client/tanstack-start/orpc.ts`                      | oRPC client setup               |
| `apps/web/src/features/github/api/get-github-profile-repos.query.ts`  | GitHub repos query              |
