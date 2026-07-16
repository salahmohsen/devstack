# Iconify Icon Resolution for Detect-Stacks Workflow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace LLM-generated SVG icons with real icons from the Iconify API in the detect-stacks workflow.

**Architecture:** Add a dedicated `resolveIcons` workflow step after `aiCategorize` that searches the Iconify API by npm package name and fetches SVG bodies. Remove all icon generation instructions from the AI agent prompt. The `DetectedStack.iconSvg` field stays on the type contract — only its source changes from LLM to Iconify.

**Tech Stack:** Iconify public API (`api.iconify.design`), `@tsu-stack/core` types, Mastra workflow steps, zod schemas.

---

## File Structure

| File                                                        | Action | Responsibility                                                                        |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `packages/core/src/stack/iconify.ts`                        | Create | Iconify API client: search icons, fetch SVG body, convert to full SVG string          |
| `packages/core/src/stack/index.ts`                          | Modify | Export new iconify utilities                                                          |
| `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts` | Modify | Add `resolveIcons` step, remove `iconSvg` from AI prompt, wire new step into pipeline |
| `apps/agent/src/mastra/agents/stack-categorizer-agent.ts`   | Modify | Remove SVG icon generation instructions from agent system prompt                      |

---

## Task 1: Create Iconify API Client Utility

**Files:**

- Create: `packages/core/src/stack/iconify.ts`

- [ ] **Step 1: Create the Iconify API client with search and SVG fetch**

```typescript
const ICONIFY_API_BASE = "https://api.iconify.design";

type IconifySearchResult = {
  icons: string[];
  total: number;
};

type IconifyIconData = {
  prefix: string;
  icons: Record<string, { body: string }>;
  width?: number;
  height?: number;
};

/**
 * Search Iconify for an icon matching a query string.
 * Returns the first matching icon ID (e.g., "mdi:react") or null.
 */
export async function searchIcon(query: string): Promise<string | null> {
  const url = `${ICONIFY_API_BASE}/search?query=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as IconifySearchResult;
  return data.icons[0] ?? null;
}

/**
 * Fetch SVG body for a given icon ID (e.g., "mdi:react").
 * Returns a full <svg> string or null on failure.
 */
export async function fetchIconSvg(iconId: string): Promise<string | null> {
  const colonIdx = iconId.indexOf(":");
  if (colonIdx === -1) return null;

  const prefix = iconId.slice(0, colonIdx);
  const name = iconId.slice(colonIdx + 1);

  const url = `${ICONIFY_API_BASE}/${prefix}.json?icons=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as IconifyIconData;
  const iconData = data.icons[name];
  if (!iconData) return null;

  const width = data.width ?? 24;
  const height = data.height ?? 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">${iconData.body}</svg>`;
}

/**
 * Resolve an icon for a given npm package name.
 * Searches Iconify, fetches the SVG, returns full SVG string or null.
 */
export async function resolveIconForPackage(npmPackage: string): Promise<string | null> {
  const iconId = await searchIcon(npmPackage);
  if (!iconId) return null;
  return fetchIconSvg(iconId);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` in `packages/core`
Expected: No errors in the new file

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/stack/iconify.ts
git commit -m "feat(core): add Iconify API client for icon resolution"
```

---

## Task 2: Export Iconify Utilities from Core Package

**Files:**

- Modify: `packages/core/src/stack/index.ts`

- [ ] **Step 1: Add iconify exports**

Add to existing barrel file:

```typescript
export { searchIcon, fetchIconSvg, resolveIconForPackage } from "./iconify";
```

- [ ] **Step 2: Verify exports resolve**

Run: `npx tsc --noEmit` in project root
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/stack/index.ts
git commit -m "feat(core): export iconify utilities from stack module"
```

---

## Task 3: Remove Icon Generation from AI Prompts

**Files:**

- Modify: `apps/agent/src/mastra/agents/stack-categorizer-agent.ts`
- Modify: `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts`

- [ ] **Step 1: Remove SVG icon instructions from agent system prompt**

In `stack-categorizer-agent.ts`, remove these lines from the `instructions` string:

```
6. If high confidence: provide a simple SVG icon (24x24, single <path>, currentColor for fill/stroke) and a one-sentence description

For iconSvg: keep it minimal — a single <path> element, stroke-based,
24x24 viewBox, currentColor so it inherits text color.
Sanitize before returning (no scripts, no event handlers).
```

The prompt should end after confidence and description:

```
5. Confidence: high/medium/low
6. A one-sentence description
```

- [ ] **Step 2: Remove SVG icon instructions from the per-package prompt in the workflow**

In `detect-stacks-workflow.ts`, the `aiCategorize` step constructs a per-package prompt at ~line 339. Remove line 361 which says:

```
6. If high confidence: provide a simple SVG icon (24x24, single <path>, currentColor) and a one-sentence description
```

The prompt should end at confidence:

```
5. Confidence: high/medium/low
```

- [ ] **Step 3: Remove `iconSvg` from the AI structured output schema**

In `detect-stacks-workflow.ts`, the `agent.generate()` call at ~line 366 has a `structuredOutput.schema` that includes:

```typescript
iconSvg: z.string().nullable(),
```

Remove this field from the schema. This is critical — the schema signals to the LLM what to output, and leaving it will cause the LLM to still generate icons even without the prompt instruction.

- [ ] **Step 4: Update the `ai.iconSvg` reference**

After removing `iconSvg` from the schema, line ~415 (`iconSvg: ai.iconSvg`) will break. Update it to:

```typescript
iconSvg: null,
```

The `resolveIcons` step added in Task 4 will populate this field from Iconify.

- [ ] **Step 5: Verify files compile**

Run: `npx tsc --noEmit` in `apps/agent`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/agent/src/mastra/agents/stack-categorizer-agent.ts apps/agent/src/mastra/workflows/detect-stacks-workflow.ts
git commit -m "feat(agent): remove SVG icon generation from all AI prompts and output schema"
```

---

## Task 4: Add resolveIcons Workflow Step

**Files:**

- Modify: `apps/agent/src/mastra/workflows/detect-stacks-workflow.ts`

- [ ] **Step 1: Add the resolveIcons step after aiCategorize**

Insert this new step between `aiCategorize` and `format`:

```typescript
const resolveIcons = createStep({
  id: "resolve-icons",
  description: "Fetches SVG icons from Iconify API for each categorized stack",
  inputSchema: aiCategorize.outputSchema,
  outputSchema: z.object({
    matched: aiCategorize.outputSchema.shape.matched,
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
  execute: async ({ inputData }) => {
    const { matched, categorized } = inputData;

    // Only resolve icons for new stacks (not existing ones)
    const toResolve = categorized.filter(
      (c) => c.existingStackId === null && c.confidence !== "low"
    );

    const resolved = await Promise.allSettled(
      toResolve.map(async (stack) => {
        const svg = await resolveIconForPackage(stack.npmPackage);
        return { npmPackage: stack.npmPackage, iconSvg: svg };
      })
    );

    const iconMap = new Map<string, string | null>();
    for (const result of resolved) {
      if (result.status === "fulfilled") {
        iconMap.set(result.value.npmPackage, result.value.iconSvg);
      }
    }

    const categorizedWithIcons = categorized.map((stack) => ({
      ...stack,
      iconSvg: iconMap.get(stack.npmPackage) ?? stack.iconSvg
    }));

    return { matched, categorized: categorizedWithIcons };
  }
});
```

- [ ] **Step 2: Wire resolveIcons into the pipeline**

Change the workflow chain from:

```typescript
.then(aiCategorize)
.then(format);
```

To:

```typescript
.then(aiCategorize)
.then(resolveIcons)
.then(format);
```

- [ ] **Step 3: Add import for resolveIconForPackage**

Add to imports at top of file:

```typescript
import { resolveIconForPackage } from "@tsu-stack/core";
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit` in `apps/agent`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/workflows/detect-stacks-workflow.ts
git commit -m "feat(agent): add resolveIcons step using Iconify API"
```

---

## Task 5: End-to-End Verification

- [ ] **Step 1: Verify fallback paths set iconSvg to null**

In `detect-stacks-workflow.ts`, the `aiCategorize` step has two fallback paths:

1. Agent not found fallback (~line 286-299) — verify `iconSvg: null`
2. Catch block on AI failure (~line 420-435) — verify `iconSvg: null`

Both should already be `null`. Confirm no code path sets a hardcoded SVG string.

- [ ] **Step 2: Run full TypeScript check**

Run: `npx tsc --noEmit` from project root
Expected: No new errors (pre-existing errors in other files are OK)

- [ ] **Step 3: Verify the workflow step chain is correct**

Confirm the workflow reads:

```
fetchRepoPackageJsons → extractDependencies → programmaticMatch → aiCategorize → resolveIcons → format
```

- [ ] **Step 4: Verify no remaining SVG generation in AI prompts**

Grep for `iconSvg` and `SVG icon` in `stack-categorizer-agent.ts` and the `aiCategorize` step — should find neither in prompt strings.

- [ ] **Step 5: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat: replace LLM icon generation with Iconify API resolution

- Add Iconify API client (search + fetch) in packages/core
- Add resolveIcons workflow step after aiCategorize
- Remove SVG icon generation instructions from AI agent prompt and output schema
- Icons now sourced from real icon catalog, not hallucinated"
```
