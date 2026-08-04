# Apply Package Workflow Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split apply-package generation into prepare → chunked rewrites (3 items) → summary+letters → assemble, and propagate real Mastra step errors to the UI instead of `no parseable output`.

**Architecture:** Keep public `ApplyPackageDraft` and `generateApplyPackage` contracts. Move pure chunk/assemble helpers + intermediate Zod schemas into `packages/core`. Refactor `apply-package-workflow` into multi-step Mastra chain (internal for-loops for chunks). Teach `callApplyPackageAgent` to read failed stream events. Fail closed; all portfolio snapshot items get `include: true` and rewrites.

**Tech Stack:** Mastra workflows (`createStep` / `createWorkflow`), Zod, Vitest (`vp test` in `@tsu-stack/core`), oRPC agent stream, BYO model via `generateModelOption`.

**Spec:** `docs/superpowers/specs/2026-08-04-apply-package-workflow-split-design.md`

---

## File map

| File                                                                                                              | Responsibility                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/core/src/application/apply-package.ts`                                                                  | Intermediate schemas; `APPLY_PACKAGE_REWRITE_CHUNK_SIZE = 3`; `chunkArray`; `assembleApplyPackageDraft`     |
| `packages/core/src/application/__tests__/apply-package.test.ts`                                                   | Schema + chunk + assemble tests                                                                             |
| `packages/core/src/application/index.ts`                                                                          | Already re-exports apply-package (no change if `export *`)                                                  |
| `apps/agent/src/mastra/workflows/apply-package-workflow/index.ts`                                                 | Wire workflow: prepare → rewrite-exp → rewrite-proj → letters → assemble                                    |
| `apps/agent/src/mastra/workflows/apply-package-workflow/prepare.step.ts`                                          | Deterministic prepare-context                                                                               |
| `apps/agent/src/mastra/workflows/apply-package-workflow/rewrite-experiences.step.ts`                              | LLM loop, chunks of 3                                                                                       |
| `apps/agent/src/mastra/workflows/apply-package-workflow/rewrite-projects.step.ts`                                 | LLM loop, chunks of 3                                                                                       |
| `apps/agent/src/mastra/workflows/apply-package-workflow/draft-summary-and-letters.step.ts`                        | LLM letters + summary                                                                                       |
| `apps/agent/src/mastra/workflows/apply-package-workflow/assemble.step.ts`                                         | Call `assembleApplyPackageDraft`                                                                            |
| `apps/agent/src/mastra/workflows/apply-package-workflow/llm-shared.ts`                                            | Shared requestContext, model, timeout race, maxOutputTokens helpers                                         |
| `apps/agent/skills/application-apply-package/SKILL.md`                                                            | Rewrite-all + phase rules                                                                                   |
| `apps/agent/src/mastra/agents/apply-package-agent.ts`                                                             | Align instructions with rewrite-all                                                                         |
| `packages/api/src/lib/application/call-apply-package-agent.ts`                                                    | Stream error extraction; TIMEOUT 240s                                                                       |
| `packages/api/src/lib/agent/agent-call-result.ts`                                                                 | Better `empty_result` user message when needed                                                              |
| `packages/core/src/application/__tests__/apply-package-stream-error.test.ts` **or** colocate pure extract in core | Prefer pure `extractMastraWorkflowStreamError` in `packages/api` tested via core only if moved — see Task 3 |
| `docs/superpowers/specs/2026-08-04-application-apply-package-design.md`                                           | Cross-link / supersede generation steps                                                                     |

---

### Task 1: Core helpers — chunk + intermediate schemas

**Files:**

- Modify: `packages/core/src/application/apply-package.ts`
- Modify: `packages/core/src/application/__tests__/apply-package.test.ts`

- [ ] **Step 1: Write failing tests for `chunkArray` and schemas**

Add to `apply-package.test.ts`:

```ts
import {
  APPLY_PACKAGE_REWRITE_CHUNK_SIZE,
  ApplyPackageExperienceRewriteChunkSchema,
  ApplyPackageProjectRewriteChunkSchema,
  ApplyPackageSummaryAndLettersSchema,
  chunkArray
} from "#@/application/apply-package";

describe("chunkArray", () => {
  it("chunks by 3", () => {
    expect(chunkArray([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
  it("handles empty", () => {
    expect(chunkArray([], 3)).toEqual([]);
  });
  it("handles fewer than size", () => {
    expect(chunkArray(["a"], 3)).toEqual([["a"]]);
  });
});

describe("rewrite chunk schemas", () => {
  it("accepts experience rewrite chunk", () => {
    const p = ApplyPackageExperienceRewriteChunkSchema.safeParse({
      items: [{ experienceId: "e1", rewrittenBullets: ["Did X"] }]
    });
    expect(p.success).toBe(true);
  });
  it("accepts project rewrite chunk", () => {
    const p = ApplyPackageProjectRewriteChunkSchema.safeParse({
      items: [{ projectId: "p1", rewrittenSummary: "App", rewrittenBullets: ["Built"] }]
    });
    expect(p.success).toBe(true);
  });
  it("accepts summary and letters", () => {
    const p = ApplyPackageSummaryAndLettersSchema.safeParse({
      professionalSummary: "x",
      coverLetterBody: "Dear...",
      outreachSubject: "Re:",
      outreachBody: "Hi",
      proposedRecruiterEmail: null
    });
    expect(p.success).toBe(true);
  });
});

describe("APPLY_PACKAGE_REWRITE_CHUNK_SIZE", () => {
  it("is 3", () => {
    expect(APPLY_PACKAGE_REWRITE_CHUNK_SIZE).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (exports missing)**

```bash
cd /Users/salah/Developer/personal-hub/.worktrees/career-mail-assistant-p0
vp run --filter @tsu-stack/core test:unit
```

Expected: FAIL — cannot import `chunkArray` / new schemas.

- [ ] **Step 3: Implement schemas + `chunkArray` in `apply-package.ts`**

Append (keep existing exports):

```ts
export const APPLY_PACKAGE_REWRITE_CHUNK_SIZE = 3 as const;

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size) as T[]);
  }
  return out;
}

export const ApplyPackageExperienceRewriteChunkSchema = z.object({
  items: z.array(
    z.object({
      experienceId: z.string().min(1),
      rewrittenBullets: z.array(z.string())
    })
  )
});
export type ApplyPackageExperienceRewriteChunk = z.infer<
  typeof ApplyPackageExperienceRewriteChunkSchema
>;

export const ApplyPackageProjectRewriteChunkSchema = z.object({
  items: z.array(
    z.object({
      projectId: z.string().min(1),
      rewrittenSummary: z.string(),
      rewrittenBullets: z.array(z.string()).optional()
    })
  )
});
export type ApplyPackageProjectRewriteChunk = z.infer<typeof ApplyPackageProjectRewriteChunkSchema>;

export const ApplyPackageSummaryAndLettersSchema = z.object({
  professionalSummary: z.string().nullable(),
  coverLetterBody: z.string(),
  outreachSubject: z.string(),
  outreachBody: z.string(),
  proposedRecruiterEmail: optionalNullableEmail.nullable(),
  notes: z.string().optional()
});
export type ApplyPackageSummaryAndLetters = z.infer<typeof ApplyPackageSummaryAndLettersSchema>;
```

Note: `optionalNullableEmail` already exists in the same file.

- [ ] **Step 4: Run tests — expect PASS for new cases**

```bash
vp run --filter @tsu-stack/core test:unit
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/apply-package.ts packages/core/src/application/__tests__/apply-package.test.ts
git commit -m "feat(core): apply-package rewrite chunk schemas and chunkArray"
```

---

### Task 2: Core `assembleApplyPackageDraft`

**Files:**

- Modify: `packages/core/src/application/apply-package.ts`
- Modify: `packages/core/src/application/__tests__/apply-package.test.ts`

- [ ] **Step 1: Write failing assemble tests**

```ts
import { assembleApplyPackageDraft } from "#@/application/apply-package";

describe("assembleApplyPackageDraft", () => {
  const portfolio = {
    profile: { name: "Sam" },
    contacts: [],
    experiences: [
      {
        id: "e1",
        title: "Eng",
        organization: "Co",
        description: "Did work"
      },
      {
        id: "e2",
        title: "Sr",
        organization: "Co2",
        description: "More"
      }
    ],
    projects: [
      {
        id: "p1",
        title: "Hub",
        summary: "s",
        description: "d"
      }
    ],
    stacks: [{ id: "s1", name: "React" }]
  };

  const jobContext = {
    title: "FE",
    companyName: "Acme",
    descriptionUsed: "Build things",
    listingFetched: false as const,
    listingUrl: null
  };

  it("fills names, include true, snapshot order", () => {
    const draft = assembleApplyPackageDraft({
      applicationId: "app1",
      jobContext,
      portfolio,
      experienceRewrites: [
        { experienceId: "e2", rewrittenBullets: ["B2"] },
        { experienceId: "e1", rewrittenBullets: ["B1"] }
      ],
      projectRewrites: [
        { projectId: "p1", rewrittenSummary: "Tailored hub", rewrittenBullets: ["X"] }
      ],
      letters: {
        professionalSummary: "Sum",
        coverLetterBody: "Cover",
        outreachSubject: "Sub",
        outreachBody: "Body",
        proposedRecruiterEmail: null
      }
    });
    expect(draft.experiences.map((e) => e.experienceId)).toEqual(["e1", "e2"]);
    expect(draft.experiences[0]).toMatchObject({
      companyName: "Co",
      title: "Eng",
      include: true,
      rewrittenBullets: ["B1"]
    });
    expect(draft.stacks).toEqual([{ stackId: "s1", include: true, name: "React" }]);
    expect(draft.jobContext.descriptionUsed).toBe("Build things");
  });

  it("throws if experience rewrite missing", () => {
    expect(() =>
      assembleApplyPackageDraft({
        applicationId: "app1",
        jobContext,
        portfolio,
        experienceRewrites: [{ experienceId: "e1", rewrittenBullets: ["B1"] }],
        projectRewrites: [{ projectId: "p1", rewrittenSummary: "ok" }],
        letters: {
          professionalSummary: null,
          coverLetterBody: "C",
          outreachSubject: "S",
          outreachBody: "B",
          proposedRecruiterEmail: null
        }
      })
    ).toThrow(/missing rewrite for experience e2/i);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
vp run --filter @tsu-stack/core test:unit
```

- [ ] **Step 3: Implement `assembleApplyPackageDraft`**

```ts
export type AssembleApplyPackageDraftInput = {
  applicationId: string;
  jobContext: ApplyPackageJobContext;
  portfolio: ApplyPackagePortfolioSnapshot;
  experienceRewrites: Array<{ experienceId: string; rewrittenBullets: string[] }>;
  projectRewrites: Array<{
    projectId: string;
    rewrittenSummary: string;
    rewrittenBullets?: string[];
  }>;
  letters: ApplyPackageSummaryAndLetters;
  generatedAt?: string;
};

export function assembleApplyPackageDraft(
  input: AssembleApplyPackageDraftInput
): ApplyPackageDraft {
  const expMap = new Map(input.experienceRewrites.map((r) => [r.experienceId, r] as const));
  const projMap = new Map(input.projectRewrites.map((r) => [r.projectId, r] as const));

  const experiences = input.portfolio.experiences.map((e) => {
    const rewrite = expMap.get(e.id);
    if (!rewrite) {
      throw new Error(`missing rewrite for experience ${e.id}`);
    }
    return {
      experienceId: e.id,
      include: true as const,
      companyName: e.organization,
      title: e.title,
      rewrittenBullets: rewrite.rewrittenBullets
    };
  });

  const projects = input.portfolio.projects.map((p) => {
    const rewrite = projMap.get(p.id);
    if (!rewrite) {
      throw new Error(`missing rewrite for project ${p.id}`);
    }
    return {
      projectId: p.id,
      include: true as const,
      name: p.title,
      rewrittenSummary: rewrite.rewrittenSummary,
      ...(rewrite.rewrittenBullets ? { rewrittenBullets: rewrite.rewrittenBullets } : {})
    };
  });

  const stacks = input.portfolio.stacks.map((s) => ({
    stackId: s.id,
    include: true as const,
    name: s.name
  }));

  const draft = {
    applicationId: input.applicationId,
    generatedAt: input.generatedAt?.trim() || new Date().toISOString(),
    jobContext: input.jobContext,
    proposedRecruiterEmail: input.letters.proposedRecruiterEmail ?? null,
    professionalSummary: input.letters.professionalSummary,
    experiences,
    projects,
    stacks,
    coverLetterBody: input.letters.coverLetterBody,
    outreachSubject: input.letters.outreachSubject,
    outreachBody: input.letters.outreachBody,
    ...(input.letters.notes != null ? { notes: input.letters.notes } : {})
  };

  const parsed = ApplyPackageDraftSchema.safeParse(draft);
  if (!parsed.success) {
    throw new Error(`apply_package_assemble_failed: ${parsed.error.message.slice(0, 200)}`);
  }
  return parsed.data;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
vp run --filter @tsu-stack/core test:unit
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/apply-package.ts packages/core/src/application/__tests__/apply-package.test.ts
git commit -m "feat(core): assembleApplyPackageDraft for multi-step apply package"
```

---

### Task 3: Stream step-error extraction (B1)

**Files:**

- Create: `packages/core/src/application/mastra-workflow-stream-error.ts` (pure, testable)
- Create: `packages/core/src/application/__tests__/mastra-workflow-stream-error.test.ts`
- Modify: `packages/core/src/application/index.ts` only if not covered by `export * from apply-package` — export from `application/index.ts`:

```ts
export * from "#@/application/mastra-workflow-stream-error";
```

- Modify: `packages/api/src/lib/application/call-apply-package-agent.ts`
- Modify: `packages/api/src/lib/agent/agent-call-result.ts` (empty_result message)

- [ ] **Step 1: Write failing tests for `extractMastraWorkflowStreamError`**

```ts
import { extractMastraWorkflowStreamError } from "#@/application/mastra-workflow-stream-error";

describe("extractMastraWorkflowStreamError", () => {
  it("reads workflow-step-error payload.message", () => {
    expect(
      extractMastraWorkflowStreamError({
        type: "workflow-step-error",
        payload: {
          stepName: "rewrite-experiences",
          error: { message: "Invalid JSON response" }
        }
      })
    ).toMatch(/Invalid JSON/);
  });

  it("reads workflow-failed string error", () => {
    expect(
      extractMastraWorkflowStreamError({
        type: "workflow-failed",
        payload: { error: "missing rewrite for experience e2" }
      })
    ).toMatch(/missing rewrite/);
  });

  it("returns null for success step without error", () => {
    expect(
      extractMastraWorkflowStreamError({
        type: "workflow-step-result",
        payload: { status: "success", output: {} }
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
vp run --filter @tsu-stack/core test:unit
```

- [ ] **Step 3: Implement extractor**

`packages/core/src/application/mastra-workflow-stream-error.ts`:

```ts
const MAX = 280;

function firstLine(msg: string): string {
  return msg.split("\n")[0]?.trim().slice(0, MAX) ?? "";
}

function fromUnknown(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return firstLine(value);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) {
      return firstLine(rec.message);
    }
    if (typeof rec.error === "string" && rec.error.trim()) {
      return firstLine(rec.error);
    }
  }
  return null;
}

/**
 * Best-effort message from a Mastra workflow stream event.
 * Returns null when the event is not a failure.
 */
export function extractMastraWorkflowStreamError(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const obj = event as Record<string, unknown>;
  const type = typeof obj.type === "string" ? obj.type : "";
  const payload =
    obj.payload && typeof obj.payload === "object"
      ? (obj.payload as Record<string, unknown>)
      : null;

  const isFailType =
    type === "workflow-step-error" || type === "workflow-failed" || type === "error";
  const stepFailed = payload?.status === "failed";

  if (!isFailType && !stepFailed) {
    // Still allow nested payload recursion for wrapped frames
    if (payload && type !== "workflow-step-result") {
      return extractMastraWorkflowStreamError({ ...payload, type: type || payload.type });
    }
    return null;
  }

  const step =
    (typeof payload?.stepName === "string" && payload.stepName) ||
    (typeof payload?.id === "string" && payload.id) ||
    null;

  const msg =
    fromUnknown(payload?.error) ??
    fromUnknown(payload?.message) ??
    fromUnknown(obj.error) ??
    fromUnknown(obj.message);

  if (!msg) return step ? `${step} failed` : "workflow step failed";
  return step && !msg.includes(step) ? `${step}: ${msg}` : msg;
}
```

Export from `packages/core/src/application/index.ts`.

- [ ] **Step 4: Wire `call-apply-package-agent.ts`**

1. Set `TIMEOUT_MS = 240_000`.
2. Change `readResultFromStream` to return `{ draft, errorMessage }`:
   - On each frame, if `extractMastraWorkflowStreamError(event)` → keep last error.
   - If draft parse succeeds → keep draft.
3. On no draft:

```ts
return {
  ok: false,
  failure: {
    reason: "empty_result",
    message:
      fromStream.errorMessage?.trim() ||
      "Apply package agent returned no usable draft (empty or truncated output)."
  }
};
```

4. Prefer `failure.message` when throwing `AGENT_FAILED` (already uses `agentCall.failure.message ?? agentFailureUserMessage` in generate — verify `generate-apply-package.ts`).

- [ ] **Step 5: Soften `agentFailureUserMessage` for `empty_result`**

```ts
case "empty_result": {
  const msg = failure.message?.trim();
  if (msg && !/^no parseable output$/i.test(msg)) return msg;
  return "AI agent returned no usable result. The model may have hit its output limit — try again or switch model in AI settings.";
}
```

- [ ] **Step 6: Run core tests — PASS**

```bash
vp run --filter @tsu-stack/core test:unit
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/application/mastra-workflow-stream-error.ts \
  packages/core/src/application/__tests__/mastra-workflow-stream-error.test.ts \
  packages/core/src/application/index.ts \
  packages/api/src/lib/application/call-apply-package-agent.ts \
  packages/api/src/lib/agent/agent-call-result.ts
git commit -m "feat(api): propagate apply-package workflow step errors"
```

---

### Task 4: Workflow shared LLM helper + prepare step

**Files:**

- Create: `apps/agent/src/mastra/workflows/apply-package-workflow/llm-shared.ts`
- Create: `apps/agent/src/mastra/workflows/apply-package-workflow/prepare.step.ts`
- Create: `apps/agent/src/mastra/workflows/apply-package-workflow/workflow-state.ts` (Zod for step I/O if needed)

**State shape (carry through steps):**

Use one expanding Zod object `ApplyPackageWorkflowStateSchema` in `workflow-state.ts` (or in core if preferred — **keep agent-local** to avoid bloating core):

```ts
// agent-local
export const ApplyPackageWorkflowStateSchema = z.object({
  applicationId: z.string(),
  jobContext: ApplyPackageJobContextSchema,
  jobBrief: z.object({
    title: z.string(),
    companyName: z.string(),
    descriptionUsed: z.string(),
    location: z.string().nullable().optional(),
    salaryRange: z.string().nullable().optional(),
    notes: z.string().nullable().optional()
  }),
  portfolio: ApplyPackagePortfolioSnapshotSchema,
  llm: RuntimeLlmConfigSchema.optional(),
  experienceRewrites: z
    .array(z.object({ experienceId: z.string(), rewrittenBullets: z.array(z.string()) }))
    .default([]),
  projectRewrites: z
    .array(
      z.object({
        projectId: z.string(),
        rewrittenSummary: z.string(),
        rewrittenBullets: z.array(z.string()).optional()
      })
    )
    .default([]),
  letters: ApplyPackageSummaryAndLettersSchema.optional()
});
```

- [ ] **Step 1: Implement `llm-shared.ts`**

```ts
// applyPackageRequestContext (move from index)
// raceGenerate(agent, prompt, schema, model, requestContext, { maxOutputTokens, timeoutMs, stepLabel })
// throws Error with `${stepLabel}: ${msg}` on failure
```

Use `modelSettings: { maxTokens: maxOutputTokens }` **or** whatever this Mastra version accepts (check existing `test-ai-provider.ts` for `modelSettings: { maxTokens: 16 }`). Mirror that API.

Constants:

```ts
export const REWRITE_CHUNK_TIMEOUT_MS = 60_000;
export const LETTERS_TIMEOUT_MS = 90_000;
export const REWRITE_MAX_OUTPUT_TOKENS = 4096;
export const LETTERS_MAX_OUTPUT_TOKENS = 8192;
```

- [ ] **Step 2: Implement `prepare.step.ts`**

- Input: `ApplyPackageWorkflowInputSchema`
- Output: state with empty rewrite arrays
- Logic: current `descriptionUsed()` helper moved here; build `jobContext` server-side; slice descriptionUsed to 14_000 as today

- [ ] **Step 3: Commit**

```bash
git add apps/agent/src/mastra/workflows/apply-package-workflow/
git commit -m "feat(agent): apply-package prepare step and LLM shared helpers"
```

---

### Task 5: Rewrite experiences + projects steps

**Files:**

- Create: `rewrite-experiences.step.ts`
- Create: `rewrite-projects.step.ts`

- [ ] **Step 1: Implement `rewrite-experiences.step.ts`**

```text
id: rewrite-experiences
input/output: ApplyPackageWorkflowStateSchema
```

Algorithm:

```ts
const chunks = chunkArray(state.portfolio.experiences, APPLY_PACKAGE_REWRITE_CHUNK_SIZE);
const merged = [];
for (let i = 0; i < chunks.length; i++) {
  const chunk = chunks[i];
  const prompt = buildExperienceChunkPrompt(state.jobBrief, chunk, i + 1, chunks.length);
  const result = await raceGenerate(..., ApplyPackageExperienceRewriteChunkSchema, {
    stepLabel: `rewrite-experiences (chunk ${i + 1}/${chunks.length})`,
    maxOutputTokens: REWRITE_MAX_OUTPUT_TOKENS,
    timeoutMs: REWRITE_CHUNK_TIMEOUT_MS
  });
  // validate ids ⊆ chunk ids; merge
  merged.push(...result.items);
}
return { ...state, experienceRewrites: merged };
```

Prompt rules: ids only; 2–5 grounded bullets; no company rename; activate skill.

If `experiences.length === 0`, skip LLM, leave `experienceRewrites: []`.

- [ ] **Step 2: Implement `rewrite-projects.step.ts`** (same pattern)

Include private `analysis` in prompt (truncated); forbid printing “Analysis:”.

- [ ] **Step 3: Commit**

```bash
git add apps/agent/src/mastra/workflows/apply-package-workflow/rewrite-experiences.step.ts \
  apps/agent/src/mastra/workflows/apply-package-workflow/rewrite-projects.step.ts
git commit -m "feat(agent): chunked apply-package experience and project rewrites"
```

---

### Task 6: Letters step + assemble step + workflow wire-up

**Files:**

- Create: `draft-summary-and-letters.step.ts`
- Create: `assemble.step.ts`
- Modify: `index.ts` (replace single-step workflow)

- [ ] **Step 1: `draft-summary-and-letters.step.ts`**

Input state with rewrites filled. Prompt includes rewritten evidence only (not full raw descriptions). Schema: `ApplyPackageSummaryAndLettersSchema`. Timeout 90s, maxOutputTokens 8192.

- [ ] **Step 2: `assemble.step.ts`**

```ts
const draft = assembleApplyPackageDraft({
  applicationId: state.applicationId,
  jobContext: state.jobContext,
  portfolio: state.portfolio,
  experienceRewrites: state.experienceRewrites,
  projectRewrites: state.projectRewrites,
  letters: state.letters! // throw if missing
});
return draft; // outputSchema: ApplyPackageDraftSchema
```

- [ ] **Step 3: `index.ts`**

```ts
export const applyPackageWorkflow = createWorkflow({
  id: "apply-package-workflow",
  inputSchema: ApplyPackageWorkflowInputSchema,
  outputSchema: ApplyPackageDraftSchema
})
  .then(prepare)
  .then(rewriteExperiences)
  .then(rewriteProjects)
  .then(draftSummaryAndLetters)
  .then(assemble);

applyPackageWorkflow.commit();
```

Remove old monolithic `analyzeAndDraft`.

**Note:** Mastra step I/O: prepare outputs state; assemble outputs draft. Intermediate steps must use compatible schemas (state → state → draft). If Mastra requires matching chain types, use state until assemble maps to draft as final step output — verify with typecheck.

- [ ] **Step 4: Typecheck agent package**

```bash
vp run --filter @tsu-stack/agent check
# or: cd apps/agent && vp check
```

Fix schema chain issues if any (common pattern: final step output = workflow output).

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/workflows/apply-package-workflow/
git commit -m "feat(agent): multi-step apply-package workflow wire-up"
```

---

### Task 7: Skill + agent instructions

**Files:**

- Modify: `apps/agent/skills/application-apply-package/SKILL.md`
- Modify: `apps/agent/src/mastra/agents/apply-package-agent.ts`

- [ ] **Step 1: Update skill**

- Replace selection-first guidance with **rewrite every provided item**.
- Phases: experience rewrite / project rewrite / summary+letters.
- PDF: all items `include: true` (server sets this; model need not emit include).
- Keep grounding, no-hallucination, cover vs outreach tone.

- [ ] **Step 2: Update agent instructions** (mirror skill phases, no select-top-N)

- [ ] **Step 3: Commit**

```bash
git add apps/agent/skills/application-apply-package/SKILL.md \
  apps/agent/src/mastra/agents/apply-package-agent.ts
git commit -m "docs(agent): apply-package skill for rewrite-all multi-step flow"
```

---

### Task 8: Parent design cross-link + smoke check

**Files:**

- Modify: `docs/superpowers/specs/2026-08-04-application-apply-package-design.md` (Mastra workflow steps section)

- [ ] **Step 1: Update parent design**

In “### Steps (logical)” replace single analyze-and-draft with pointer:

```markdown
2. **apply-package-workflow (split)** — see `2026-08-04-apply-package-workflow-split-design.md`:
   prepare → rewrite-experiences (chunks of 3) → rewrite-projects (chunks of 3) → summary+letters → assemble.
   Product: rewrite all portfolio-opted-in items; all `include: true` on PDF.
```

- [ ] **Step 2: Manual smoke (dev)**

1. Restart agent worker so new workflow loads.
2. Prepare package on an application with ≥4 experiences (forces 2 experience chunks).
3. Expect success draft with all items; or toast with real error (not only `no parseable output`).

- [ ] **Step 3: Run unit tests**

```bash
vp run --filter @tsu-stack/core test:unit
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-04-application-apply-package-design.md
git commit -m "docs: point apply-package parent design at workflow split"
```

---

## Execution notes

- Worktree: `.worktrees/career-mail-assistant-p0` on branch `feature/career-mail-assistant-p0`.
- Do **not** implement partial draft save or parallel chunks.
- Prefer TDD for core pure functions; workflow steps are harder to unit-test without Mastra harness — rely on assemble + stream-error unit tests + manual smoke.
- If Mastra workflow typing rejects state→draft chain, use a single final `format` step pattern from `resume-import-workflow` (prepare → … → format).
- **Step ids (must match stream/toast):** `prepare-context`, `rewrite-experiences`, `rewrite-projects`, `draft-summary-and-letters`, `assemble-draft`.
- **Prompt payload caps:** description ≤ ~1200 chars/item; project `analysis` ≤ ~800 (not the old 2.5k monolithic slices).
- **Per-chunk completeness:** after each rewrite LLM call, fail the step if any expected id in that chunk is missing (clearer than waiting for assemble).
- **Observability:** log chunk index/size/duration/success (no secrets, no full bodies).
- Confirm `modelSettings` / max tokens option on in-process `agent.generate` (mirror `test-ai-provider.ts`; typecheck will catch mismatches).

---

## Done when

1. Core tests for chunk, assemble, stream error pass.
2. Workflow is multi-step; old single generate is gone.
3. Agent call timeout 240s; step errors surface in API failure message.
4. Manual generate works on multi-item portfolio without max_tokens null content (or fails with clear step message).
