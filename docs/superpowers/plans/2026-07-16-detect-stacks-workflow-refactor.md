# Detect Stacks Workflow Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 861-line monolithic detect-stacks workflow into a dedicated folder with individual step files.

**Architecture:** Each workflow step becomes its own `.step.ts` file. Utility functions and constants go in `utils.ts`. Internal Zod schemas go in `detect-stacks-workflow.schema.ts`. The `index.ts` orchestrates the step chain.

**Tech Stack:** TypeScript, Zod, Mastra workflows

---

## File Map

| Action | File                                                                                      |
| ------ | ----------------------------------------------------------------------------------------- |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema.ts` |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/utils.ts`                         |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/fetch-repo-package-jsons.step.ts` |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/extract-dependencies.step.ts`     |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/programmatic-match.step.ts`       |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/ai-categorize.step.ts`            |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/deduplicate-groups.step.ts`       |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/resolve-icons.step.ts`            |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/format.step.ts`                   |
| Create | `apps/agent/src/mastra/workflows/detect-stacks-workflow/index.ts`                         |
| Delete | `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts`                               |

---

### Task 1: Create schema file

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema.ts`

- [ ] **Step 1: Create the schema file**

Extract the 2 internal Zod schemas from the monolith (lines 250-273):

```typescript
import { z } from "zod";

export const batchOutputSchema = z.array(
  z.object({
    npmPackage: z.string(),
    belongsToExistingStack: z.boolean(),
    existingStackName: z.string().nullable(),
    type: z.string().nullable(),
    displayName: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    description: z.string().nullable()
  })
);

export const categorizedEntrySchema = z.object({
  npmPackage: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  repo: z.string(),
  relatedPackages: z.array(z.string()),
  iconSvg: z.string().nullable(),
  stackId: z.null(),
  existingStackId: z.string().nullable()
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema.ts
git commit -m "refactor: extract detect-stacks internal schemas into folder"
```

---

### Task 2: Create utils file

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/utils.ts`

- [ ] **Step 1: Create the utils file**

Extract from lines 10-60 (NOISE_PATTERNS + utility functions), lines 247-248 (BATCH constants), line 174-179 (ExtractedDep type), line 275 (CategorizedEntry type), line 692 (InitData type):

```typescript
import { z } from "zod";

import { DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { categorizedEntrySchema } from "./detect-stacks-workflow.schema";

// ── Noise patterns ─────────────────────────────────────────────────
export const NOISE_PATTERNS = [
  /^@types\//,
  /^@repo\//,
  /^@workspace\//,
  /^typescript$/,
  /^@tsconfig\//,
  /^eslint/,
  /^prettier/,
  /^@eslint\//,
  /^@prettier\//,
  /^jest$/,
  /^vitest$/,
  /^@jest\//,
  /^@vitest\//,
  /^ts-jest$/,
  /^ts-node$/,
  /^tsx$/,
  /^nodemon$/,
  /^concurrently$/,
  /^npm-run-all/,
  /^rimraf$/,
  /^@changesets\//,
  /^changesets$/,
  /^@size-limit\//,
  /^size-limit$/
];

export function isNoisePackage(name: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(name));
}

export function isWorkspaceProtocol(version: string): boolean {
  return version.startsWith("workspace:");
}

export function parsePackageJson(content: string | null): Record<string, unknown> | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractDepsFromPackageJson(
  pkg: Record<string, unknown> | null
): Record<string, string> {
  if (!pkg) return {};
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  return { ...deps, ...devDeps };
}

// ── Batch constants ────────────────────────────────────────────────
export const BATCH_CHUNK_SIZE = 25;
export const BATCH_TIMEOUT_MS = 180_000;

// ── Types ──────────────────────────────────────────────────────────
export type ExtractedDep = {
  name: string;
  version: string;
  repo: string;
  workspace: string | null;
};

export type CategorizedEntry = z.infer<typeof categorizedEntrySchema>;

export type InitData = z.infer<typeof DetectStacksWorkflowInputSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/utils.ts
git commit -m "refactor: extract detect-stacks utility functions and constants"
```

---

### Task 3: Create fetch-repo-package-jsons step

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/fetch-repo-package-jsons.step.ts`

- [ ] **Step 1: Create the step file**

Extract lines 62-121 from the monolith:

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { parsePackageJson } from "./utils";

export const fetchRepoPackageJsons = createStep({
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
    const results: Array<{
      repo: string;
      rootPkg: Record<string, unknown> | null;
      workspacePkgs: Array<{ workspace: string; pkg: Record<string, unknown> }>;
    }> = [];

    for (const repoPkg of inputData.repoPackages) {
      try {
        const rootPkg = parsePackageJson(repoPkg.rootPkgContent);

        const workspacePkgs: Array<{
          workspace: string;
          pkg: Record<string, unknown>;
        }> = [];

        for (const wp of repoPkg.workspacePkgContents) {
          const pkg = parsePackageJson(wp.content);
          if (pkg) {
            workspacePkgs.push({ workspace: wp.workspace, pkg });
          }
        }

        results.push({
          repo: repoPkg.repo,
          rootPkg,
          workspacePkgs
        });
      } catch (error) {
        console.warn(`[detect-stacks] Failed to parse repo ${repoPkg.repo}:`, error);
        results.push({
          repo: repoPkg.repo,
          rootPkg: null,
          workspacePkgs: []
        });
      }
    }

    return { repoPackages: results };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/fetch-repo-package-jsons.step.ts
git commit -m "refactor: extract fetch-repo-package-jsons step"
```

---

### Task 4: Create extract-dependencies step

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/extract-dependencies.step.ts`

- [ ] **Step 1: Create the step file**

Extract lines 123-172:

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { extractDepsFromPackageJson, isNoisePackage, isWorkspaceProtocol } from "./utils";
import { fetchRepoPackageJsons } from "./fetch-repo-package-jsons.step";

export const extractDependencies = createStep({
  id: "extract-dependencies",
  description: "Extracts and deduplicates dependencies from package.json files",
  inputSchema: fetchRepoPackageJsons.outputSchema,
  outputSchema: z.object({
    dependencies: z.array(
      z.object({
        name: z.string().describe("npm package name"),
        version: z.string().describe("Version specifier from package.json"),
        repo: z.string().describe("Source repository URL"),
        workspace: z.string().nullable().describe("Workspace name if monorepo, null for root")
      })
    )
  }),
  execute: async ({ inputData }) => {
    const allDeps = new Map<
      string,
      { name: string; version: string; repo: string; workspace: string | null }
    >();

    for (const repoPkg of inputData.repoPackages) {
      const rootDeps = extractDepsFromPackageJson(repoPkg.rootPkg);
      for (const [name, version] of Object.entries(rootDeps)) {
        if (isNoisePackage(name) || isWorkspaceProtocol(version)) continue;
        if (!allDeps.has(name)) {
          allDeps.set(name, { name, version, repo: repoPkg.repo, workspace: null });
        }
      }

      for (const wp of repoPkg.workspacePkgs) {
        const wpDeps = extractDepsFromPackageJson(wp.pkg);
        for (const [name, version] of Object.entries(wpDeps)) {
          if (isNoisePackage(name) || isWorkspaceProtocol(version)) continue;
          if (!allDeps.has(name)) {
            allDeps.set(name, {
              name,
              version,
              repo: repoPkg.repo,
              workspace: wp.workspace
            });
          }
        }
      }
    }

    return { dependencies: Array.from(allDeps.values()) };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/extract-dependencies.step.ts
git commit -m "refactor: extract extract-dependencies step"
```

---

### Task 5: Create programmatic-match step

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/programmatic-match.step.ts`

- [ ] **Step 1: Create the step file**

Extract lines 181-245:

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { extractDependencies } from "./extract-dependencies.step";
import { type ExtractedDep } from "./utils";

export const programmaticMatch = createStep({
  id: "programmatic-match",
  description: "Matches extracted dependencies against existing stack_dependency records",
  inputSchema: extractDependencies.outputSchema,
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
    unknown: z.array(
      z.object({
        name: z.string(),
        version: z.string(),
        repo: z.string(),
        workspace: z.string().nullable()
      })
    )
  }),
  execute: async (params) => {
    const initData = params.getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;
    console.log(
      `[DEBUG-WF-4b] initData existingStacks: ${initData.existingStacks?.length}, existingDependencies: ${initData.existingDependencies?.length}, lastScan: ${initData.lastScan ? "yes" : "no"}`
    );
    const { dependencies } = params.inputData;

    const dependencyMap = new Map(
      initData.existingDependencies.map((d) => [d.npmPackage, d.stackId])
    );

    const matched: Array<{
      npmPackage: string;
      stackId: string;
      name: string;
      repo: string;
      relatedPackages: string[];
    }> = [];
    const unknown: ExtractedDep[] = [];

    for (const dep of dependencies) {
      const stackId = dependencyMap.get(dep.name);
      if (stackId) {
        matched.push({
          npmPackage: dep.name,
          stackId,
          name: dep.name,
          repo: dep.repo,
          relatedPackages: []
        });
      } else {
        unknown.push(dep);
      }
    }

    console.log(
      `[DEBUG-WF-5] programmaticMatch complete, matched: ${matched.length}, unknown: ${unknown.length}`
    );
    return { matched, unknown };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/programmatic-match.step.ts
git commit -m "refactor: extract programmatic-match step"
```

---

### Task 6: Create ai-categorize step

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/ai-categorize.step.ts`

- [ ] **Step 1: Create the step file**

Extract lines 277-548. This is the largest step (271 lines). It uses `batchOutputSchema`, `categorizedEntrySchema`, `BATCH_CHUNK_SIZE`, `BATCH_TIMEOUT_MS`, `CategorizedEntry`, and `InitData` from utils/schema.

The full file is too large for inline code here. The implementer should:

1. Read the monolith file at lines 277-548
2. Extract the `aiCategorize` createStep call
3. Import `batchOutputSchema` from `./detect-stacks-workflow.schema`
4. Import `BATCH_CHUNK_SIZE`, `BATCH_TIMEOUT_MS`, `CategorizedEntry`, `InitData` from `./utils`
5. Import `DetectStacksWorkflowInputSchema` from `@tsu-stack/core`
6. Import `programmaticMatch` from `./programmatic-match.step` (for inputSchema reference)

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/ai-categorize.step.ts
git commit -m "refactor: extract ai-categorize step"
```

---

### Task 7: Create deduplicate-groups step

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/deduplicate-groups.step.ts`

- [ ] **Step 1: Create the step file**

Extract lines 550-628. Uses `InitData` from utils and `DetectStacksWorkflowInputSchema` from core.

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/deduplicate-groups.step.ts
git commit -m "refactor: extract deduplicate-groups step"
```

---

### Task 8: Create resolve-icons step

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/resolve-icons.step.ts`

- [ ] **Step 1: Create the step file**

Extract lines 630-690. Imports `resolveIconForPackage` from `@tsu-stack/core`.

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/resolve-icons.step.ts
git commit -m "refactor: extract resolve-icons step"
```

---

### Task 9: Create format step

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/format.step.ts`

- [ ] **Step 1: Create the step file**

Extract lines 694-846. Uses `InitData` from utils and `DetectStacksWorkflowInputSchema`, `DetectStacksOutputSchema` from core.

- [ ] **Step 2: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/format.step.ts
git commit -m "refactor: extract format step"
```

---

### Task 10: Create index.ts and delete old file

**Files:**

- Create: `apps/agent/src/mastra/workflows/detect-stacks-workflow/index.ts`
- Delete: `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts`

- [ ] **Step 1: Create the index.ts orchestrator**

```typescript
import { createWorkflow } from "@mastra/core/workflows";

import { DetectStacksWorkflowInputSchema, DetectStacksOutputSchema } from "@tsu-stack/core";

import { aiCategorize } from "./ai-categorize.step";
import { deduplicateGroups } from "./deduplicate-groups.step";
import { extractDependencies } from "./extract-dependencies.step";
import { fetchRepoPackageJsons } from "./fetch-repo-package-jsons.step";
import { format } from "./format.step";
import { programmaticMatch } from "./programmatic-match.step";
import { resolveIcons } from "./resolve-icons.step";

export const detectStacksWorkflow = createWorkflow({
  id: "detect-stacks-workflow",
  inputSchema: DetectStacksWorkflowInputSchema,
  outputSchema: DetectStacksOutputSchema
})
  .then(fetchRepoPackageJsons)
  .then(extractDependencies)
  .then(programmaticMatch)
  .then(aiCategorize)
  .then(deduplicateGroups)
  .then(resolveIcons)
  .then(format);

detectStacksWorkflow.commit();
```

- [ ] **Step 2: Delete the old flat file**

```bash
rm apps/agent/src/mastra/workflows/detect-stacks-workflow.ts
```

- [ ] **Step 3: Verify import resolution**

The import in `apps/agent/src/mastra/index.ts` stays the same:

```typescript
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
```

- [ ] **Step 4: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow/index.ts apps/agent/src/mastra/workflows/detect-stacks-workflow.ts
git commit -m "refactor: replace flat detect-stacks workflow with folder structure"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit -p apps/agent/tsconfig.json
```

Expected: No new errors (pre-existing `orpc.ts` error is unrelated)

- [ ] **Step 2: Verify old file deleted**

```bash
ls apps/agent/src/mastra/workflows/detect-stacks-workflow.ts 2>&1
```

Expected: "No such file or directory"

- [ ] **Step 3: Verify folder structure**

```bash
ls apps/agent/src/mastra/workflows/detect-stacks-workflow/
```

Expected: 10 files — `index.ts`, `detect-stacks-workflow.schema.ts`, `utils.ts`, 7 `*.step.ts` files
