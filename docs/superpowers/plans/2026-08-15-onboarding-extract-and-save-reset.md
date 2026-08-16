# Wave 0 — Resume extract coerce + save-button reset

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop production resume import from wiping a good extract when stacks come back as strings, and reset Failed → Save when the user edits an integration / AI provider form.

**Spec:** Grill lock 2026-08-15. Not a design spec — these are bugs.  
**Depends on:** nothing.  
**Blocks:** onboarding hardening.

---

## Why it fails

`resume-import-extractor` instructions say stacks are **names** (`"React"`).  
`ResumeExtractOutputSchema.stacks` is `z.array(z.object({ name, … }))`.  
`agent.generate({ structuredOutput: { schema } })` throws.  
`extract.step.ts` catches and returns `emptyExtract([message])` — **profile, experiences, and projects are discarded**.  
UI: “Analysis incomplete” / “Resume extract failed: Structured output validation failed: stacks.N expected object, received string”.

Save on AI (and other integration cards) sets `saveFlash = "failed"` and only clears it when the dialog remounts.

---

## Task 1: Accept string or object stacks

**Files:**

- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/extract-output.schema.ts`
- Modify: `apps/agent/src/mastra/agents/resume-import-extractor-agent.ts`
- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/extract.step.ts`
- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/normalize.step.ts`
- Create/modify: agent unit tests next to extract schema or normalize

- [ ] **Step 1: Coerce in the extract schema** (this is what structured output validates)

```ts
const ResumeExtractStackSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const name = value.trim();
      return name ? { name } : value;
    }
    return value;
  },
  z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional()
  })
);
```

Apply the same idea if a whole `stacks` array is missing (`default([])`).

- [ ] **Step 2: Fix extractor instructions**

Replace “stacks — technologies/skills as stack names” with: each stack is an **object** `{ name, description?, type? }`. Examples must be objects, not bare strings.

- [ ] **Step 3: Do not wipe other sections**

In `extract.step.ts`, if `generate` returns an object that fails `safeParse`, run a salvage parse: coerce `stacks` items, drop only invalid stack entries, keep profile / experiences / projects that parse. Only use `emptyExtract` when there is **no** usable object.

If `generate` throws and the error includes the raw object (Mastra / SDK), salvage that object the same way. If there is truly no payload, keep `emptyExtract` with the warning.

- [ ] **Step 4: Normalize already assumes objects** — keep dropping empty names; add a test that `["React", { name: "TypeScript" }]` becomes two stack drafts.

- [ ] **Step 5:** `vp check` in `apps/agent` (or the package that owns the workflow tests). Confirm the fixture that used to throw now yields stacks + experiences.

---

## Task 2: Failed save returns to Save on edit

**Files:**

- Modify: `apps/web/src/features/ai-settings/ui/ai-providers.tsx`
- Modify: any other integration configure dialog that keeps a `saveFlash === "failed"` / `StatusSubmitButton` failed state (Resend in `apps/web/src/features/mail-settings/ui/resend-integration.tsx` if it has the same pattern)

- [ ] **Step 1:** When configure-form values change after a failed save or failed test, set flash back to `null` so the button label is **Save** (or **Test** on the probe button).

- [ ] **Step 2:** Success flash on Test can still auto-clear after `FLASH_HOLD_MS`. Failed flash must **not** persist across edits.

- [ ] **Step 3:** Same rule for standalone Test buttons on cards that support save → test.

Manual check: Save → test fails → change API key or label → button reads Save / Test, not Failed.

---

## Out of scope

- Onboarding step machine, review redesign, merge apply, Resend in Connect
- Retrying the LLM
- Changing fail-closed behavior for a completely missing structured object
