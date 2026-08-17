# Search brief triage receipt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Land on `main` (user asked to push directly).

**Goal:** A search-brief-only hub turn shows File Diff and never invents a Cancelled New jobs triage card.

**Architecture:** Tighten `cancelledTriageCardInputFromParts` (same helper Today already uses). Skip recovery on `getSearchBrief`. Allow inbox fallback only when this message has triage-processor leak text.

**Tech Stack:** TypeScript, Vitest (`apps/web`), assistant-ui hub message receipt

**Spec:** [2026-08-17-search-brief-triage-receipt-design.md](../specs/2026-08-17-search-brief-triage-receipt-design.md)

**Post-implement:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md)

---

### Task 1: Failing helper tests

**Files:**

- Modify: `apps/web/src/features/agent-hub/lib/hub-superpowers-tools.test.ts`

- [x] **Step 1: Write failing tests** (do not change production code yet)

```ts
it("does not invent a card on a search-brief turn", () => {
  expect(
    cancelledTriageCardInputFromParts(
      [
        {
          type: "tool-get-search-brief",
          toolName: "getSearchBrief",
          state: "input-available"
        }
      ],
      [{ id: "fb1", title: "Fallback", companyName: "Co", matchScore: 70 }]
    )
  ).toBeNull();
});

it("does not invent a card from inbox when this turn never listed jobs", () => {
  expect(
    cancelledTriageCardInputFromParts(
      [],
      [{ id: "fb1", title: "Fallback", companyName: "Co", matchScore: 70 }]
    )
  ).toBeNull();
});
```

- [x] **Step 2: Run** from `apps/web`:

```bash
vp test run src/features/agent-hub/lib/hub-superpowers-tools.test.ts
```

Expected: FAIL — helper still hydrates from fallback.

### Task 2: Minimal helper fix

**Files:**

- Modify: `apps/web/src/features/agent-hub/lib/hub-tool-names.ts` (`cancelledTriageCardInputFromParts`)

- [x] **Step 3: Implement**

- Import / use existing `isGetSearchBriefToolName`.
- If any part is `getSearchBrief` / `get-search-brief`, return null (same place as Today).
- `source = jobs.length > 0 ? jobs : (hasLeakText ? fallbackJobs : [])` where `hasLeakText` is a text part matching `TRIAGE_PROCESSOR_LEAK_RE`.

- [x] **Step 4: Re-run the same file** — all tests in that describe pass, including existing leak + listNewJobs cases.

- [x] **Step 5: Commit on main** then `git push origin main`.

### Task 3: Harness

- [x] Reload `/dashboard`, confirm the goals turn has File Diff and no New jobs triage.
- [x] Append a LESSONS.md entry (silent card-only turn + inbox fallback).
