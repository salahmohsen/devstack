# Job preference two-axis + evaluate-then-insert — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New jobs only inserts two-axis survivors, with work mode / hiring region / skills / take filled before the card appears; then wipe this tenant’s discovery rows and harden.

**Architecture:** $0 extract (adapter + JSON-LD hydrate + dictionaries) decides work mode and hiring region. Cheap shortlist no longer ±ranks mode/location. A per-candidate evaluate job (reuse inbox-AI queue) runs leftover BYO extract + score + take, then inserts inbox **or** dismissed. Shared `job_posting` stays ATS/HTTP-only.

**Tech Stack:** `@tsu-stack/core`, Drizzle, oRPC, BullMQ, existing `scoreApplicationMatch` + `generateAgentTake`.

**Spec:** `docs/superpowers/specs/2026-08-15-job-preference-two-axis-extraction-design.md`

**Skills after implementation:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) (Task 8) — required. Include tenant discovery wipe (Task 7) **before** that loop.

**Workspace:** Continue on `feature/job-discovery-adapters` worktree. Do not mix unrelated main dirt.

## Global Constraints

- No communal LLM. Never write AI guesses onto `job_posting`.
- Two-axis is a **hard filter**. Unknown `workMode` after $0 extract → **drop** (AI does not unblock land).
- Remote + no region → `worldwide`. Remote + `latam` does not overlap Egypt/KSA.
- One 2×N increment per evaluate that called the agent (extract and/or score and/or take).
- Score fail → insert `dismissed` + `via: low_match`, no take, backfill evaluate.
- Two-axis / unknown-mode fail → no row.
- Take fail → still insert keeper.
- No BYO key → insert after $0 two-axis only (cheap score, no take).
- N = AI-passed inbox this run (cheap-passed if no key). In-flight evaluate is not an inbox stub.
- 50-cap = `trackingStatus=inbox` only.
- Do not reject because the seeker lacks a required skill.
- Do not auto-create stacks from job skill names.
- After code: wipe **this tenant** discovery applications + AI budget, then harden. Do not wipe other tenants or `job_posting`.
- Tests: `vp test run <file>` from the package. Commits: conventional, subject ≤72 chars.

---

## File map

| Path                                                                 | Responsibility                                                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/core/src/job-discovery/hiring-region.ts`                   | Synonyms, ancestors, `normalizeHiringRegion`, `hiringRegionsOverlap` |
| `packages/core/src/job-discovery/two-axis.ts`                        | `decideTwoAxis` hard filter                                          |
| `packages/core/src/job-discovery/cheap-score.ts`                     | Remove mode/location ±rank; keep title/exclude                       |
| `packages/core/src/application/job-skills.ts`                        | `JobSkillTag` zod + `resolveJobSkillTags`                            |
| `packages/core/src/application/types.ts`                             | Output: workMode, hiringRegion, requiredSkills, preferredSkills      |
| `packages/db/src/schema/job-posting.schema.ts`                       | `hiringRegion`, `employmentType`                                     |
| `packages/db/src/schema/application.schema.ts`                       | `workMode`, `hiringRegion`, `requiredSkills`, `preferredSkills`      |
| `packages/api/src/lib/job-discovery/adapters/*`                      | Map ATS workplace/employment/region                                  |
| `packages/api/src/lib/job-discovery/hydrate.ts`                      | Persist JSON-LD mode/employment/region/skills when stated            |
| `packages/api/src/lib/job-discovery/land.ts`                         | Shortlist + $0 two-axis; enqueue evaluate; no stub insert            |
| `packages/api/src/lib/job-discovery/inbox-ai.ts`                     | Evaluate: extract leftover, score, take, insert inbox or dismissed   |
| `apps/web` Settings work-mode control + Details rows + Find-now copy |

---

### Task 1: Hiring region + two-axis (core)

**Files:**

- Create: `packages/core/src/job-discovery/hiring-region.ts`
- Create: `packages/core/src/job-discovery/two-axis.ts`
- Create: `packages/core/src/job-discovery/__tests__/hiring-region.test.ts`
- Create: `packages/core/src/job-discovery/__tests__/two-axis.test.ts`
- Modify: `packages/core/src/job-discovery/index.ts` (export)

**Interfaces:**

- Produces: `normalizeHiringRegion(raw: string | null): string | null`
- Produces: `hiringRegionsOverlap(userLocations: string[], listingRegion: string | null, listingLocation: string | null): boolean`
- Produces: `decideTwoAxis(input): { action: "pass" | "drop"; reason: string }`

- [ ] **Step 1: Write failing tests** for LatAm vs Egypt, worldwide pass, unknown mode drop, all-three modes skip mode filter.

```ts
import { describe, expect, it } from "vitest";
import { normalizeHiringRegion, hiringRegionsOverlap } from "#@/job-discovery/hiring-region";
import { decideTwoAxis } from "#@/job-discovery/two-axis";

it("maps LatAm to latam and does not overlap egypt", () => {
  expect(normalizeHiringRegion("LatAm")).toBe("latam");
  expect(hiringRegionsOverlap(["egypt"], "latam", "LatAm")).toBe(false);
  expect(hiringRegionsOverlap(["egypt"], "mena", null)).toBe(true);
  expect(hiringRegionsOverlap(["egypt"], "worldwide", null)).toBe(true);
});

it("drops unknown work mode", () => {
  expect(
    decideTwoAxis({
      workMode: null,
      hiringRegion: "worldwide",
      location: null,
      prefs: { workModes: ["remote"], locations: ["egypt"] }
    }).action
  ).toBe("drop");
});
```

- [ ] **Step 2:** `cd packages/core && vp test run src/job-discovery/__tests__/hiring-region.test.ts` — FAIL (module missing).
- [ ] **Step 3:** Implement synonym table + ancestor graph (`egypt` → `mena` → `emea`) + `decideTwoAxis` per spec.
- [ ] **Step 4:** Re-run tests — PASS.
- [ ] **Step 5:** Commit `feat(core): two-axis hiring region match`.

---

### Task 2: Cheap score no longer ± mode/location

**Files:**

- Modify: `packages/core/src/job-discovery/cheap-score.ts`
- Modify: `packages/core/src/job-discovery/__tests__/cheap-score.test.ts`

- [ ] **Step 1:** Add a test that a title hit with `workMode: "remote"` and prefs hybrid+Egypt still **passes cheap** (rank only). Two-axis is a later gate.

- [ ] **Step 2:** Remove the work-mode ±15 and location ±10 blocks from `scoreCatalogAgainstPreference`.
- [ ] **Step 3:** `cd packages/core && vp test run src/job-discovery` — PASS.
- [ ] **Step 4:** Commit `fix(core): cheap score drops mode location rank`.

---

### Task 3: Job skill tags + resolve

**Files:**

- Create: `packages/core/src/application/job-skills.ts`
- Create: `packages/core/src/application/__tests__/job-skills.test.ts`
- Modify: `packages/core/src/application/index.ts`
- Modify: `packages/core/src/application/types.ts` (`ApplicationOutputSchema`: `workMode` nullable, `hiringRegion` nullable, `requiredSkills` / `preferredSkills` arrays)

**Interfaces:**

- Produces: `JobSkillTagSchema` `{ name, stackId, band }`
- Produces: `resolveJobSkillTags(names: { name: string; band: "required" | "preferred" }[], stacks: { id: string; name: string }[]): JobSkillTag[]`

- [ ] **Step 1:** Test React → matching stack id (case-insensitive); Katalon → `stackId: null`; band preserved.
- [ ] **Step 2:** Implement normalize (`trim`, lower, collapse spaces) and exact name match only (no auto-create).
- [ ] **Step 3:** `cd packages/core && vp test run src/application/__tests__/job-skills.test.ts` — PASS.
- [ ] **Step 4:** Commit `feat(core): resolve job skill tags to user stacks`.

---

### Task 4: Schema + migration

**Files:**

- Modify: `packages/db/src/schema/job-posting.schema.ts` — `hiringRegion` text, `employmentType` text
- Modify: `packages/db/src/schema/application.schema.ts` — `workMode` text, `hiringRegion` text, `requiredSkills` jsonb default `[]`, `preferredSkills` jsonb default `[]`
- Modify: repositories `createIfAbsentByUrl` / update / `toApplicationOutput`
- Generate: `packages/db` migration via package `db:generate` (from worktree, confirm `DATABASE_URL`)

- [ ] **Step 1:** Add columns + types in `packages/db/src/types`.
- [ ] **Step 2:** `cd packages/db && vp check` — 0 errors.
- [ ] **Step 3:** Generate and apply migration.
- [ ] **Step 4:** Commit `feat(db): work mode region and job skills columns`.

---

### Task 5: Adapter + hydrate persist stated fields

**Files:**

- Modify: `packages/api/src/lib/job-discovery/raw.ts` (`asWorkMode`, employment, region helpers)
- Modify: `packages/api/src/lib/job-discovery/adapters/freehire.ts` — map `work_mode` / enrichment / source-typical fields
- Modify: `packages/api/src/lib/job-discovery/hydrate.ts` — if extract has workMode/location/employment/skills/hiringRegion, write to catalog when currently null (stated JSON-LD only)
- Modify: `packages/core/src/common/extract-job-listing-page.ts` — `applicantLocationRequirements`, `employmentType`, skills from JobPosting
- Test: adapter normalize tests + extract JSON-LD fixture with `jobLocationType: TELECOMMUTE`

- [ ] **Step 1:** Fixture: Ashby-shaped raw `{ workplaceType: "Remote", location: "LatAm", employmentType: "FullTime" }` → `workMode=remote`, `hiringRegion=latam`.
- [ ] **Step 2:** Hydrate writes those fields when catalog values are null; never overwrite a non-null ATS workMode with a dictionary guess.
- [ ] **Step 3:** `cd packages/api && vp test run src/lib/job-discovery` and `cd packages/core && vp test run src/common` — PASS.
- [ ] **Step 4:** Commit `feat(api): persist ATS and JSON-LD job workplace fields`.

---

### Task 6: Evaluate-then-insert

**Files:**

- Modify: `packages/api/src/lib/job-discovery/land.ts` — after cheap sort, hydrate + `decideTwoAxis`; on pass enqueue evaluate with `{ userId, postingId, runId }` (**do not** `createIfAbsentByUrl` here)
- Modify: `packages/api/src/lib/job-discovery/inbox-ai.ts` — accept postingId; load posting; leftover extract; score; fail → insert dismissed; pass → take → insert inbox with new fields
- Modify: `packages/core/src/job-discovery/queue.ts` — evaluate payload may use postingId (keep `inboxAiJobId` unique: `eval_${userId}_${postingId}`)
- Modify: enqueue + server worker payload schema
- Test: unit `decide` path already in core; API test that land helper does not return created=true without two-axis pass

**Interfaces:**

- Consumes: `decideTwoAxis`, `resolveJobSkillTags`, `scoreApplicationMatch`, `generateAgentTake`
- Produces: insert inbox only for keepers

- [ ] **Step 1:** Change `JobInboxAiPayloadSchema` to `{ userId, runId, postingId, applicationId? }`.
- [ ] **Step 2:** Land loop: `$0` drop skips enqueue. Pool size = `computeLandBudget` (now “to evaluate”).
- [ ] **Step 3:** Evaluate worker: increment budget only if an agent HTTP will run; score fail → dismissed + backfill enqueue; pass → take + inbox insert.
- [ ] **Step 4:** `cd packages/api && vp test run src/lib/job-discovery` and `cd packages/api && vp check` — 0 errors.
- [ ] **Step 5:** Commit `feat(api): evaluate jobs before inbox insert`.

---

### Task 7: Settings check + Details + toast

**Files:**

- Modify: Settings jobs work-mode control (pressed state + `CheckIcon` next to label)
- Modify: locations field description (two-axis copy)
- Modify: `application-info-panel.tsx` Details: Work mode, Hiring region, skill chips
- Modify: `find-jobs-now-job.tsx` copy if needed (“Scoring matches, then adding keepers…”)
- Modify: `toApplicationOutput` mapping

- [ ] **Step 1:** Selected work mode shows a check; unselected does not.
- [ ] **Step 2:** Details show Remote (not only LatAm) when `workMode=remote`.
- [ ] **Step 3:** `cd apps/web && vp check` — 0 errors on touched files.
- [ ] **Step 4:** Commit `feat(web): work mode check and job skill details`.

---

### Task 8: Wipe this tenant’s discovery data

**Do not run until Tasks 1–7 are merged to the worktree.** Confirm userId (local `salah`) before delete.

Wipe:

- `application` where `user_id = $TENANT` and (`discovery_run_id` is not null OR `source_tags` contains `discovery`)
- activity cascades
- `user_job_ai_budget` rows for that user
- Do **not** `TRUNCATE job_posting`
- Do **not** delete mail or non-discovery tracked CRM unless the user confirms

- [ ] **Step 1:** Print counts (inbox/dismissed/tracked discovery, budget attempts) before delete.
- [ ] **Step 2:** Delete in a transaction; print after counts (inbox discovery = 0).
- [ ] **Step 3:** Confirm prefs still `frontend`, locations egypt/KSA, work modes as the user left them, `importFromEmail=false`.
- [ ] **Step 4:** Commit is **not** required (data-only). Record counts in the hardening report.

---

### Task 9: Harden + optimize (required)

Follow [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) + verification-before-completion.

**Contract:** Settings check + two-axis copy; Find now inserts only keepers with take; LatAm remote absent for Egypt/KSA; Dismissed has score fails only; Scan still gated; inbox ≤ 50; Details show work mode.

**Loops:** core/api unit tests; oRPC findNow + list/count; Chrome Settings + New jobs + Dismissed + Tracked.

- [ ] **Step 1:** Restart worktree API after package edits (vite-node will serve stale `packages/api` otherwise).
- [ ] **Step 2:** Find now → assert no `Remote · LatAm` in inbox when prefs are Egypt/KSA; Ashby remotes that overlap MENA/worldwide may appear with `workMode=remote` and a take.
- [ ] **Step 3:** Score-fail sample in Dismissed with `via: low_match`.
- [ ] **Step 4:** Fix root causes; re-run the same loop.
- [ ] **Step 5:** Prepend `LESSONS.md`; write the hardening report in the PR/session. Commit `test: harden two-axis evaluate-then-insert` if code changed.

---

## Spec coverage

| Spec lock                                                     | Task      |
| ------------------------------------------------------------- | --------- |
| Two-axis + taxonomy                                           | 1         |
| Cheap no ± mode/location                                      | 2         |
| Skill tags + no auto-create                                   | 3         |
| Columns                                                       | 4         |
| ATS/JSON-LD persist                                           | 5         |
| Evaluate-then-insert, take before show, dismiss on score fail | 6         |
| Check icon + Details                                          | 7         |
| Wipe tenant discovery                                         | 8         |
| Hardening                                                     | 9         |
| No communal LLM / unknown mode drop                           | 1 + 5 + 6 |

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-08-15-job-preference-two-axis-extraction.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — this session, executing-plans, checkpoints

Which approach?
