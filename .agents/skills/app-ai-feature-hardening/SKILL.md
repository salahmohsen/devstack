---
name: app-ai-feature-hardening
description: Use when testing or hardening dashboard/AI product features after implementation, before claiming a feature works or is done, when validating hub chat tools HITL cards detect/organize stacks multi-entry UI flows Mastra workflows, when a plan or design says to run app-ai-feature-hardening, or when the user asks to test/harden the app or AI features.
---

# App + AI feature hardening

## Overview

**Core principle:** A feature is not hardened until a **fresh, agent-runnable feedback loop** proves the **user-facing behavior** on every entry path that writes or reads the same state.

**Violating the letter of this process is violating the spirit of verification.**

This skill is **self-learning**: every run must **read** then **append** durable lessons to [LESSONS.md](LESSONS.md). Plans that ship AI/dashboard features must require this skill after implementation.

**REQUIRED BACKGROUND:** superpowers:verification-before-completion (no claims without evidence). For hard bugs during hardening, use diagnose / superpowers:systematic-debugging — do not invent patches without a loop.

## When to use

- After implementing a dashboard or AI feature (hub tools, HITL, workflows, AI jobs)
- Before "done", PR, or merge for those features
- When the user says test / harden / smoke / verify the app or AI
- When executing a plan that links this skill (e.g. hub agent superpowers)

**When not to use:** Pure docs/types refactors with no runtime behavior; unit-only library changes that never touch UI or agent streams (use package tests instead).

## Iron laws

```
1. NO "WORKS" WITHOUT A FRESH LOOP THIS SESSION
2. API 200 ≠ UI WORKS — UI changes require browser (or explicit substitute + stated gap)
3. ONE FEATURE → ALL ENTRY PATHS THAT SHARE STATE
4. MATCH PRODUCT PATTERNS (coss AlertDialog, not window.confirm; existing HITL cards)
5. FIX ROOT CAUSE; APPEND THE LESSON
```

## Process (every run)

### 0. Load memory

1. Read [LESSONS.md](LESSONS.md) fully (newest first if long).
2. Read the feature **spec/plan** if one exists under `docs/superpowers/`.
3. Note any **user preferences** already recorded in LESSONS.md.

### 1. Define the contract

Write down (in the reply, short):

| Item                     | Content                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| **User-visible success** | What a human sees/does that means "works"                            |
| **Entry paths**          | Every menu/form/route/agent tool that starts or consumes the feature |
| **Shared state**         | DB rows, caches, job store, project links, thread memory             |
| **Non-goals**            | What this run will not cover                                         |

If the user stated preferences (e.g. "use coss dialogs"), record them in the contract and later in LESSONS.md.

### 2. Build the feedback loop

**Spend disproportionate effort here.** Prefer, in order:

1. Unit/integration test at a real seam (packages/core, agent step pure logic)
2. Authenticated **oRPC/curl** against running `apps/server` + `apps/agent`
3. Browser exercise of the changed UI (required when layout/dialog/HITL/chrome changed)
4. Stream/workflow event inspection (Mastra step results, not just final toast)

Harness recipes for this monorepo: [harness.md](harness.md).

**No loop → stop.** List what you tried; ask for access/artifacts; do not claim pass.

### 3. Run the matrix

For each entry path × success criterion:

- [ ] Happy path
- [ ] Empty / no data
- [ ] Auth/provider failure (GitHub OAuth, BYO AI missing)
- [ ] Cancel / abort mid-job (if streaming)
- [ ] Discard / outside-click with **unsaved** state (must use product dialogs)
- [ ] Second surface that **reads** the same state (list vs form vs detail vs agent tool)

Feature-type checklists: [checklists.md](checklists.md).

### 4. Harden

For each failure:

1. Root-cause (not symptom) — systematic-debugging if stuck after 2 weak guesses
2. Minimal fix at the owning layer (core rule > workflow step > UI)
3. Re-run **the same loop** that failed
4. Prefer generic guards (allowlists, safe display names, empty-update paths) over one-repo hacks

### 5. Learn (mandatory before "done")

Append to [LESSONS.md](LESSONS.md) using the template at the top of that file:

- Generic finding (reusable on the next feature)
- User preference (if any)
- Evidence class (not a one-off stack trace dump)

Update [checklists.md](checklists.md) only when a **new class** of check appears twice.

### 6. Report

```
## Hardening report
- Contract: …
- Loops used: …
- Paths verified: …
- Failures found → fixes: …
- Lessons appended: (titles)
- Gaps (not verified): …
```

**No completion language** without listing the commands/UI steps and their outcomes from **this** session.

## Rationalizations (forbidden)

| Excuse                              | Reality                                  |
| ----------------------------------- | ---------------------------------------- |
| "API returned 200"                  | Prove the UI and persisted state         |
| "Worked once in my head"            | Re-run the loop                          |
| "Menu path works, form is the same" | Dual entry paths diverge constantly      |
| "window.confirm is fine"            | Product uses coss AlertDialog — match it |
| "I'll learn later"                  | Append LESSONS.md before done            |
| "Private GitHub / session is hard"  | Document blocker; don't fake pass        |

## Red flags — STOP

- About to say done/fixed/passes without a fresh loop
- Only tested one of {list menu, form sheet, agent tool, toast Review}
- Library/exists rows missing after AI pipeline (check intermediate workflow steps)
- Unsaved discard uses browser `confirm` or silent close
- Claiming accuracy without checking multi-product scope merges (e.g. TanStack products)

## Related

- [harness.md](harness.md) — env, session, ports, oRPC, browser
- [checklists.md](checklists.md) — AI job, HITL, dual-entry, hub tools
- [LESSONS.md](LESSONS.md) — living memory (read/write every run)
- Project: [Workflow](../../workflow.md), [End-to-end features](../../end-to-end-features.md), [Mastra agent](../../../apps/agent/AGENTS.md)
