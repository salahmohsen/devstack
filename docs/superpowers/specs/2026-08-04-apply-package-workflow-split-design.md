# Apply Package Workflow Split — Design

**Date:** 2026-08-04  
**Status:** Approved (brainstorm)  
**Parent:** [Application Apply Package](./2026-08-04-application-apply-package-design.md)  
**Goal:** Make apply-package generation reliable under structured-output token limits by splitting the single LLM call into a chunked multi-step Mastra workflow, and surface real step errors to the UI instead of `no parseable output`.

---

## Problem

### Observed failure

`POST /rpc/applications/generateApplyPackage` fails with:

| Signal      | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| Model       | e.g. `minimax-m3`                                                 |
| Provider    | `stop_reason: max_tokens`, `content: null`, `output_tokens: 4096` |
| Agent       | `AI_APICallError: Invalid JSON response`                          |
| API / toast | `no parseable output` → `AGENT_FAILED`                            |

### Root causes

1. **One structured generate** asks the model to emit a full `ApplyPackageDraft` (all experiences, projects, stacks, cover letter, outreach) in a single JSON payload. Output scales with portfolio size and hits provider max-output caps mid-JSON.
2. **Stream error loss:** `callApplyPackageAgent` only extracts a successful draft from the Mastra stream. Step failures collapse to `empty_result` / `"no parseable output"`.

Industry guidance matches this: structured outputs fail when generation stops at `max_tokens` before the schema is complete; multi-step pipelines keep each structured response small.

---

## Product decisions (frozen)

| #   | Topic          | Decision                                                                                                                         |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Evidence set   | Portfolio-opted-in experiences / projects / stacks only (existing preflight / snapshot)                                          |
| 2   | Rewrite scope  | **Rewrite every** experience and project in the snapshot for the job (grounded language; no invented employers, titles, metrics) |
| 3   | PDF membership | **All** snapshot experiences and projects appear on the tailored resume PDF (`include: true` for all of them)                    |
| 4   | Stacks         | All snapshot stacks with `include: true`                                                                                         |
| 5   | Selection UX   | No “omit weak items” / catalog of `include: false` rows as the default product path                                              |
| 6   | Public API     | Unchanged: one `generateApplyPackage` → one persisted `ApplyPackageDraft`                                                        |
| 7   | Partial drafts | **Fail closed** — any step/chunk failure aborts; no draft saved                                                                  |
| 8   | Chunk size     | **3** experiences or projects per rewrite LLM call                                                                               |
| 9   | Error UX       | Propagate real step error messages to the client toast (B1)                                                                      |
| 10  | UI chrome      | No new screens; optional step progress labels are out of scope for v1                                                            |

---

## Architecture

```text
UI: Prepare package
  → applications.generateApplyPackage          (entry unchanged)
      → preflight + thin-JD fetch              (unchanged)
      → callApplyPackageAgent
           apply-package-workflow              (INTERNAL SPLIT — this design)
      → persist ApplyPackageDraft
  → Package Sheet / Accept / Send              (contracts unchanged)
```

### Workflow steps

| #   | Step id                     | Kind     | Responsibility                                                             |
| --- | --------------------------- | -------- | -------------------------------------------------------------------------- |
| 1   | `prepare-context`           | Code     | Ground `jobContext`; normalize portfolio lists; shared job brief           |
| 2   | `rewrite-experiences`       | LLM loop | Chunks of 3 → `rewrittenBullets` by `experienceId`                         |
| 3   | `rewrite-projects`          | LLM loop | Chunks of 3 → `rewrittenSummary` (+ optional bullets) by `projectId`       |
| 4   | `draft-summary-and-letters` | LLM      | `professionalSummary` + cover + outreach + proposed email + optional notes |
| 5   | `assemble-draft`            | Code     | Merge → full `ApplyPackageDraft`; fill names; `include: true`; validate    |

```text
prepare-context
  → rewrite-experiences  (for each chunk of 3)
  → rewrite-projects     (for each chunk of 3)
  → draft-summary-and-letters
  → assemble-draft  → ApplyPackageDraft
```

### Why this shape

- Each structured output stays **bounded** (≤3 items or letters-only).
- Model does not re-emit company names, titles, project names, or full JD text (server fills).
- Matches product: rewrite **all** portfolio items; all on PDF.
- Mastra `.then` / multi-step workflows fit this pattern; per-call max output tokens are a safety net only.

### Alternatives considered

| Approach                                       | Verdict                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| Single generate + higher maxTokens             | Rejected as sole fix — hard provider caps and large portfolios still fail |
| Three fat steps (all exp / all proj / letters) | Rejected — all-experiences call can still hit 4k                          |
| One LLM call per item                          | Deferred — max isolation but high cost/latency                            |
| Select-then-rewrite (top N only)               | Rejected — product wants all portfolio items rewritten                    |

---

## Data

### Unchanged public contract

`ApplyPackageDraft` (and Accept / Package Sheet) remain the persisted shape. No dual storage of intermediate chunk results on `application`.

### Intermediate schemas (workflow-only)

Prefer defining in `packages/core` under apply-package so agent + tests share contracts.

**Prepared context (prepare output):**

- `applicationId`
- `jobContext` (fully server-grounded: title, company, `descriptionUsed`, listing flags)
- `jobBrief` / job summary fields for prompts
- Full snapshot lists: experiences, projects, stacks, profile, contacts
- `llm` (BYO runtime config)

**Experience rewrite chunk result:**

```ts
{
  items: Array<{ experienceId: string; rewrittenBullets: string[] }>;
}
```

**Project rewrite chunk result:**

```ts
{
  items: Array<{
    projectId: string;
    rewrittenSummary: string;
    rewrittenBullets?: string[];
  }>;
}
```

**Summary + letters result:**

```ts
{
  professionalSummary: string | null
  coverLetterBody: string
  outreachSubject: string
  outreachBody: string
  proposedRecruiterEmail: string | null
  notes?: string
}
```

### Assemble rules

| Field                             | Source                                                     |
| --------------------------------- | ---------------------------------------------------------- |
| `applicationId`, `generatedAt`    | Server                                                     |
| `jobContext`                      | Prepare only (never trust model echo of full JD)           |
| Experience `companyName`, `title` | Portfolio by id                                            |
| Experience `include`              | Always `true`                                              |
| Experience `rewrittenBullets`     | Merged chunk results                                       |
| Project `name`                    | Portfolio by id                                            |
| Project `include`                 | Always `true`                                              |
| Project rewrites                  | Merged chunk results                                       |
| Stacks                            | All snapshot stacks; `include: true`; names from portfolio |
| Summary + letters + email         | Letters step                                               |

**Id hygiene:**

- Drop any model id not in the snapshot.
- If any snapshot experience or project has **no** rewrite after all chunks → **fail** with a clear message (e.g. `missing rewrite for experience <id>`). Do not silently omit (would break “all on PDF”).

### Chunking

```text
for experiences in groups of 3:
  LLM(rewrite chunk) → merge by experienceId
for projects in groups of 3:
  LLM(rewrite chunk) → merge by projectId
```

Skip an empty type. Preflight already requires at least one experience or project overall.

### Prompt payload (lean)

**Rewrite chunk:** per item — id, title/org or name, truncated description (≤ ~1200 chars), project `analysis` ≤ ~800 when present; shared job brief (truncated descriptionUsed if needed).

**Letters:** job brief, profile/contacts, **rewritten** experiences/projects (not raw full portfolio walls), stack names.

---

## Agent & skill

- Keep **one** agent: `applyPackageAgent` (BYO via `requestContext` / `generateModelOption`).
- Each LLM step uses a different small `structuredOutput` schema + prompt.
- Update skill `application-apply-package`:
  - Phase guidance: rewrite experience / rewrite project / summary+letters.
  - Remove “select top items / list include:false for catalog” as primary path.
  - Keep grounding and no-hallucination rules; cover formal vs outreach short.

### Model settings (safety net)

Per generate, set an explicit output budget (Mastra / AI SDK: `maxOutputTokens` or project-equivalent `modelSettings`):

| Call                    | Suggested cap        |
| ----------------------- | -------------------- |
| Rewrite chunk (3 items) | ~2k–4k output tokens |
| Summary + letters       | ~4k–8k output tokens |

Chunking is the primary fix; caps avoid accidental tiny defaults.

---

## Error propagation (B1)

### Target path

```text
Mastra stream: workflow-step-error | workflow-failed | step status=failed
  → extract short message (payload.error / .message)
  → AgentCallFailure { reason, message }
  → generateApplyPackage → AGENT_FAILED({ message })
  → client toastAiError(error.message)
```

### Message rules

- Prefer first useful line; cap ~200–280 chars for user-facing text.
- Prefer step context when easy: e.g. `rewrite-experiences (chunk 2/4): …`.
- Never put stack traces, API keys, or full prompts in toast text.
- Full detail stays in server/agent logs.

### Today → after

| Today                                   | After                                |
| --------------------------------------- | ------------------------------------ |
| Missing draft → `"no parseable output"` | Real step error message when present |
| Toast generic / empty                   | Actionable provider or step reason   |

Optional later: richer `parseAiError` kinds for titles. Not required for this design.

---

## Timeouts & retries

| Scope                             | Budget                        |
| --------------------------------- | ----------------------------- |
| Each rewrite chunk                | 60s                           |
| Summary + letters                 | 90s                           |
| Entire agent HTTP call / workflow | **240s** (apply-package only) |

Call count estimate: `ceil(N/3) + ceil(M/3) + 1` LLM calls.

**v1:** No hard portfolio item cap; no custom multi-retry loops per chunk (fail on first chunk failure). Rely on existing Mastra/provider retries if any.

**Logging:** per chunk index/size/duration/success; on fail, step id + message (no secrets).

---

## API & UI

| Surface                             | Change                                   |
| ----------------------------------- | ---------------------------------------- |
| `generateApplyPackage` input/output | Unchanged shape                          |
| Failure message                     | Carry through detailed `failure.message` |
| Package Sheet / Accept / Send       | Unchanged                                |
| Loading UX                          | Single busy state is enough for v1       |
| Toast                               | Shows propagated step/provider message   |

---

## Testing

| Layer                | Cases                                                                          |
| -------------------- | ------------------------------------------------------------------------------ |
| Unit                 | Chunk split: lengths 0, 1, 3, 4, 7 → expected chunk counts                     |
| Unit                 | Assemble fills names and `include: true`; fails if snapshot id missing rewrite |
| Unit                 | Stream error extractor prefers step error over `no parseable output`           |
| Optional integration | Mocked multi-step success path                                                 |

No live MiniMax e2e required in CI.

---

## Non-goals (this change)

- Partial draft persistence
- Multiple agent registry entries
- Parallel chunk execution (sequential v1; parallel is a later speedup)
- Step progress toasts/labels (optional later)
- Changing organize-stacks or other workflows (reuse B1 pattern later)
- Easy Apply / ATS automation

---

## Implementation touchpoints (for planning)

| Area                 | Files (indicative)                                                      |
| -------------------- | ----------------------------------------------------------------------- |
| Intermediate schemas | `packages/core/src/application/apply-package.ts` (+ exports/tests)      |
| Workflow             | `apps/agent/src/mastra/workflows/apply-package-workflow/` (split steps) |
| Skill                | `apps/agent/skills/application-apply-package/SKILL.md`                  |
| Agent instructions   | `apps/agent/src/mastra/agents/apply-package-agent.ts`                   |
| Stream errors        | `packages/api/src/lib/application/call-apply-package-agent.ts`          |
| Failure user message | `packages/api/src/lib/agent/agent-call-result.ts` (if needed)           |
| Timeout              | `call-apply-package-agent.ts` TIMEOUT_MS → 240s                         |
| Parent design note   | Cross-link from parent apply-package design (workflow steps section)    |

---

## Success criteria

1. Generate succeeds for portfolios that previously hit `max_tokens` / null content on a single-shot draft (typical multi-item portfolio + MiniMax-class caps).
2. On failure, toast/API message reflects the failing step/provider reason, not only `no parseable output`.
3. Accepted PDF still includes every portfolio-opted-in experience and project with rewritten language.
4. Accept / Send / draft schema consumers need no breaking changes.

---

## Open follow-ups (not blocking)

- Parallel rewrite chunks for latency
- Streamed step labels in the UI
- Preflight soft warning when estimated LLM calls exceed a threshold
- Shared stream-error helper for other agent workflows
