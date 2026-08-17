# Today letter as a story — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Checkbox steps are the work list.
>
> **REQUIRED after implementation:** [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) — fresh loop on hub Today (first open, second open same morning, mail lead vs group, inbox take-less omit, tracked move-only, empty letter). Append `LESSONS.md`. Do not claim done from a screenshot of the old inventory.

**Goal:** Today stays the same door (`getDailyBrief` → `openDailyBrief` panel) but the letter is a **story of deltas**, written by a **Mastra workflow**, not the hub supervisor.

**Architecture:** Persist a per-user cursor and a mail `summary`. Classify writes the one-liner. Land hydrates thin JDs then writes `agentTake`. `today-letter-workflow` gathers windowed facts then writes markdown (empty → template, no LLM). `getDailyBrief` **runs that workflow same-turn** (`createRun` + `start`, same as `classifyMail`). Supervisor only opens the returned letter. Client stamps the cursor after a successful panel open. Kill the client inventory rebuild that currently overwrites short letters.

**Tech stack:** Drizzle (`packages/db`), Zod in `@tsu-stack/core`, oRPC, Mastra **workflow + steps** + classify, existing `generateAgentTake` / hydrate listing path.

**Spec:** [2026-08-17-today-letter-story-design.md](../specs/2026-08-17-today-letter-story-design.md)

**Skills:** `mastra` (classify + tools), [end-to-end features](../../../.agents/end-to-end-features.md), [workflow](../../../.agents/workflow.md) (migrations), [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) after ship.

**Do not:** `deleteMail`, swipe, pin, triage on Today, catalog/`findJobsNow` on Today, generate summaries or takes inside `getDailyBrief`, stamp the cursor on `getDailyBrief`, put the cursor on Better Auth `user`.

---

## File map

| Area            | Create / modify                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema          | `packages/db/src/schema/mail-message.schema.ts` (`summary`); create `packages/db/src/schema/user-hub-state.schema.ts`; export in `schema/index.ts`; generate types + migration                                                  |
| Repos           | `mail-message.repository.ts` (`applyClassification` + `findReceivedSince`); `application-activity.repository.ts` (`listMovesSince`); `application.repository.ts` (inbox-with-take since); create `user-hub-state.repository.ts` |
| Core            | `packages/core/src/mail/classify.ts` (`MailClassifyOutput.summary`); `packages/core/src/ai-settings/hub-personality.ts` (Today rhythm only)                                                                                     |
| Classify skill  | `apps/agent/skills/mail-classification/SKILL.md`                                                                                                                                                                                |
| Classify run    | `mail-classify-workflow/ai.step.ts`; `apps/server/src/queues/run-mail-classify.ts`; `get-mail.tool.ts` `classifyMail` persist                                                                                                   |
| Land            | `packages/api/src/lib/job-discovery/inbox-ai.ts` (and land hydrate call sites if they still skip thin+AI)                                                                                                                       |
| Core schemas    | `packages/core` Today letter facts + workflow I/O (keep in core so API/web/agent share)                                                                                                                                         |
| Workflow        | Create `apps/agent/src/mastra/workflows/today-letter-workflow/` (`index.ts`, `gather-facts.step.ts`, `write-letter.step.ts`, optional writer agent). Register in `apps/agent/src/mastra/index.ts`                               |
| Hub tool        | `apps/agent/src/mastra/tools/get-daily-brief.tool.ts` — run workflow, return `{ markdown, empty, since, counts, … }`                                                                                                            |
| Prompt          | `apps/agent/src/mastra/lib/hub-system-prompt.ts` Path: Today — do not write the letter                                                                                                                                          |
| Processor       | `hub-superpowers-policy.ts` reminder: open panel with returned markdown, do not compose                                                                                                                                         |
| Cursor API      | `packages/api/src/routers/agent.router.ts` (or small `hub-state` procedure on the same router); web mutation in `apps/web/src/features/agent-hub/api/`                                                                          |
| Panel stamp     | `apps/web/src/features/agent-hub/ui/open-daily-brief-tool-ui.tsx`                                                                                                                                                               |
| Letter fallback | `apps/web/src/features/agent-hub/lib/format-daily-brief.ts` + existing `.test.ts`                                                                                                                                               |
| Facts parse     | `hub-tool-names.ts` `latestDailyBriefFactsFromMessages` if field names change                                                                                                                                                   |
| Spec            | Status + plan link on the design spec                                                                                                                                                                                           |

**Do not touch:** delete tools, Gmail trash, program 4 list chrome, Better Auth `user` schema.

---

## Locked implementation notes

1. **Inventory fallback is a bug.** `resolveDailyBriefMarkdown` + `isTruncatedDailyBriefMarkdown` (`length < 80`) treat a valid “nothing new” letter as truncated and **rebuild** `## New jobs / Mail / Tracked`. Empty letters must pass through. Only replace **cut-off** model output (trailing em dash, unclosed `**`, half sentence). Do not rebuild an inventory as the happy path.
2. **Cursor write:** `opened: true` from `openDailyBrief` on the **latest** assistant message. `opened: false` (stale remount) must not stamp.
3. **`since = dailyBriefOpenedAt ?? now - 24h`.** Inclusive `>= since`.
4. **Summary overwrite:** `applyClassification` sets `summary` only when the new value is non-empty **and** the stored summary is null/empty. Never wipe a good line on re-classify.
5. **Summary cap:** trim to 280 chars at persist.
6. **Heuristic classify:** no summary (null). LLM path only.
7. **Inbox slice:** `trackingStatus = inbox` AND `createdAt >= since` AND `agentTake` trimmed non-empty. Soft-fail take → omit.
8. **Tracked slice:** `application_activity.kind` in `stage_changed` \| `outcome_set` \| `promoted` and `createdAt >= since`. Join application for company/title. Do not invent activity rows from CRM mail (mail slice already has them).
9. **Facts caps (safety, not the letter shape):** mail 50, inbox 20, tracked 20. Counts are **window totals**, not capped lengths (so the writer can say “N more”).
10. **Voice files** keep rhythm (Cairo joke, Dry clipped, Coach next-action, Quiet shortest). Delete the `## New jobs / ## Mail / ## Tracked` law from each prompt. Grouping lives only in `hub-system-prompt.ts`.
11. **Core cache:** any new/changed `@tsu-stack/core` export used by the agent requires `pnpm --filter @tsu-stack/agent rebuild:core-cache` (or `dev`, which runs it).
12. **Migration:** `vp run db:generate` then check `DATABASE_URL` is not production before `vp run db:migrate`.
13. **Workflow, not chat author.** The supervisor must not compose markdown. `getDailyBrief` waits on `today-letter-workflow`. Not `hub-background-workflow.tools` (those are approval-gated long jobs).
14. **Empty skips the writer agent.** Template only. Do not spend BYO tokens on “nothing new.”
15. **New core exports** for workflow I/O go in `@tsu-stack/core` (same as classify). Rebuild core cache.

---

### Task 1: Schema + repos

**Files:**

- Modify: `packages/db/src/schema/mail-message.schema.ts`
- Create: `packages/db/src/schema/user-hub-state.schema.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/repositories/mail-message.repository.ts`
- Modify: `packages/db/src/repositories/application-activity.repository.ts`
- Modify: `packages/db/src/repositories/application.repository.ts`
- Create: `packages/db/src/repositories/user-hub-state.repository.ts` + export from repositories index
- Generate: types under `packages/db/src/types`, migration via `vp run db:generate`

- [x] **Step 1:** Add `summary: text("summary")` nullable on `mail_message`.

- [x] **Step 2:** Add `user_hub_state`:

```ts
export const userHubState = pgTable("user_hub_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dailyBriefOpenedAt: timestamp("daily_brief_opened_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
```

- [x] **Step 3:** `applyClassification` accepts optional `summary`. Persist trimmed ≤280 only when incoming is non-empty and existing `summary` is null/empty.

- [x] **Step 4:** `findReceivedSince({ userId, since, limit })` — `purpose = career` (or `includeSystem: false`), `receivedAt >= since`, newest first.

- [x] **Step 5:** `applicationActivityRepository.listMovesSince({ userId, since, limit })` — kinds above, join application for `title` / `companyName`.

- [x] **Step 6:** Inbox query: user + `trackingStatus = inbox` + `createdAt >= since` + `agentTake` is not null and not `''`.

- [x] **Step 7:** `userHubStateRepository.get(userId)` / `markDailyBriefOpened(userId, at = now)` upsert.

- [x] **Step 8:** Generate migration + types. Confirm `DATABASE_URL` is the **dev** Neon branch before migrate.

---

### Task 2: Classify output + skill

**Files:**

- Modify: `packages/core/src/mail/classify.ts`
- Modify: `apps/agent/skills/mail-classification/SKILL.md`
- Modify: `apps/agent/src/mastra/workflows/mail-classify-workflow/ai.step.ts`
- Modify: existing core mail classify tests if they snapshot `MailClassifyOutput`

- [x] **Step 1:** `MailClassifyOutputSchema` gains `summary: z.string().max(280).nullable().optional()`.

- [x] **Step 2:** `LlmLabelSchema` in `ai.step.ts` gains `summary` (one plain sentence: who + what they want). Map onto classify output. Guards (`applyJobAlertDigestGuard`) must **spread** `summary` (they already spread `...result`).

- [x] **Step 3:** Skill **Output** section: add `summary` — one neutral sentence, no voice, no “consider delete”, no Today headings, English unless the mail is not. Empty/null if there is nothing to say.

- [x] **Step 4:** Heuristic classify returns no `summary`.

- [x] **Step 5:** `pnpm --filter @tsu-stack/agent rebuild:core-cache` after core export change.

---

### Task 3: Persist summary on every classify write

**Files:**

- Modify: `apps/server/src/queues/run-mail-classify.ts`
- Modify: `apps/agent/src/mastra/tools/get-mail.tool.ts` (`classifyMail` `applyClassification`)
- Any other `applyClassification(` call that is the LLM success path

- [x] **Step 1:** Pass `summary: result.summary` into `applyClassification` meta (or a 5th arg — keep one options object: `{ mastraClassifyRunId, mastraClassifyTraceId, summary }`).

- [x] **Step 2:** Skip-already-classified / failed LLM: do not write summary.

---

### Task 4: Land — hydrate thin JD, then take

**Files:**

- Modify: `packages/api/src/lib/job-discovery/inbox-ai.ts`
- Modify: `packages/api/src/lib/job-discovery/land.ts` only if it still **drops** thin+AI before inbox insert (two-axis/land gates stay)
- Modify: existing `inbox-ai-decision` / inbox-ai tests if they encode “thin → skip take”

- [x] **Step 1:** After a row is kept for inbox, if `isThinJobDescription` and a listing URL exists, call the same hydrate used for listings (`hydratePostingIfNeeded` / listing markdown alternate). Reload description.

- [x] **Step 2:** If still thin → leave `agentTake` null. If not thin → `generateAgentTake` (existing). Catch → null take. Do not fail the land.

- [x] **Step 3:** Do not block inbox **insert** on take when the current flow already inserts first; generate take after insert (already the thick path). Thin path should insert, hydrate, then take.

- [x] **Step 4:** Remove “thin JD + hasAiKey → skip AI entirely” only where it **prevents take**. Do not spend evaluate/score budget on a still-thin JD if that was a land **gate** (two-axis / N keepers). If a stub is already in inbox, hydrate+take is allowed.

---

### Task 5: `today-letter-workflow` + `getDailyBrief` runs it

**Files:**

- Create: `packages/core` Today letter schemas (facts + workflow in/out) — e.g. `packages/core/src/hub/today-letter.ts` (name may match existing hub folder)
- Create: `apps/agent/src/mastra/workflows/today-letter-workflow/index.ts`
- Create: `apps/agent/src/mastra/workflows/today-letter-workflow/gather-facts.step.ts`
- Create: `apps/agent/src/mastra/workflows/today-letter-workflow/write-letter.step.ts`
- Optional: `apps/agent/src/mastra/agents/today-letter-writer-agent.ts` (or `generate` on a thin agent)
- Modify: `apps/agent/src/mastra/index.ts` (`workflows.todayLetter` + agent if new)
- Modify: `apps/agent/src/mastra/tools/get-daily-brief.tool.ts`

- [x] **Step 1:** Core schemas for gather output / workflow output:

```ts
{
  dateLabel: string,
  since: string,
  empty: boolean,
  markdown: string,
  mail: Array<{ id, fromName, subject, labels, summary: string | null, receivedAt: string | null }>,
  inbox: Array<{ id, title, companyName, matchScore: number | null, agentTake: string }>,
  tracked: Array<{ applicationId, title, companyName, kind, body: string | null, createdAt: string }>,
  mailCount: number,
  inboxCount: number,
  trackedCount: number
}
```

- [x] **Step 2:** `gather-facts` step: `since = dailyBriefOpenedAt ?? now - 24h`. Three window queries (caps in locked note 9). `empty` when all counts are 0. No LLM.

- [x] **Step 3:** `write-letter` step:
  - `empty` → `# {dateLabel}\n\nNothing new since {sinceLabel}.` (or “this morning” if 24h fallback). Return. No agent.
  - else → writer agent, `hubPersonality` + BYO from `requestContext` / `input.llm`. Prompt = grouping law from spec §4.5. Output `{ markdown }`.
  - fail (no key, timeout, empty model) → short fail letter. Never the old `## New jobs` inventory.

- [x] **Step 4:** `createWorkflow({ id: "today-letter-workflow" }).then(gather).then(write).commit()`.

- [x] **Step 5:** `getDailyBrief` execute: resolve `userId` from requestContext, `createRun()` + `start({ inputData: { userId, llm }, requestContext })` like `classifyMail`. Return the workflow result (must include `markdown`). Description: run Today letter workflow; then `openDailyBrief` with that markdown; do not rewrite.

- [x] **Step 6:** `rebuild:core-cache` after new core exports. Restart agent so registration is live.

---

### Task 6: Stamp cursor after successful open

**Files:**

- Modify: `packages/api/src/routers/agent.router.ts` (add `markDailyBriefOpened`)
- Create: `apps/web/src/features/agent-hub/api/mark-daily-brief-opened.mutation.ts` (or colocated in existing hub api)
- Modify: `apps/web/src/features/agent-hub/ui/open-daily-brief-tool-ui.tsx`

- [x] **Step 1:** Protected procedure, no input, upsert `dailyBriefOpenedAt = now()`. Output `{ ok: true, openedAt: string }`.

- [x] **Step 2:** In `OpenDailyBriefToolUI`, after `opened: true` + `addToolOutput`, fire the mutation **once** (`useRef`). Do not call when `opened: false`.

- [x] **Step 3:** Mutation failure must not block the panel or the tool output. Log/ignore; next Today will reuse the old window (safe).

---

### Task 7: Supervisor path + client fallback (do not compose)

**Files:**

- Modify: `apps/agent/src/mastra/lib/hub-system-prompt.ts`
- Modify: `apps/agent/src/mastra/lib/hub-superpowers-policy.ts` (Today reminder)
- Modify: `packages/core/src/ai-settings/hub-personality.ts` + `hub-personality.test.ts`
- Modify: `apps/web/src/features/agent-hub/lib/format-daily-brief.ts`
- Modify: `apps/web/src/features/agent-hub/lib/format-daily-brief.test.ts`
- Modify: `apps/web/src/features/agent-hub/lib/hub-tool-names.ts` (`parseDailyBriefFacts` / latest facts — must read `markdown`)
- Modify: `apps/agent/src/mastra/lib/hub-system-prompt.test.ts` if it asserts the old `## New jobs` shape

- [x] **Step 1:** Path: Today becomes:

```
1. Call getDailyBrief (runs the Today workflow). Wait.
2. Call openDailyBrief({ markdown }) with the returned markdown. Do not rewrite. Do not add sections.
3. One spoken line. No paste, no triage, no findJobsNow.
```

- [x] **Step 2:** Processor reminder after `getDailyBrief`: open panel with **that** markdown. Do not compose a letter.

- [x] **Step 3:** Voice prompts: drop `## New jobs / ## Mail / ## Tracked` examples. Keep rhythm only. Writer agent (workflow) may still read voice overlay via `hubPersonality`.

- [x] **Step 4:** `isTruncatedDailyBriefMarkdown`: remove `length < 80` as sufficient. Keep cut-off detectors. A short “Nothing new since this morning.” is **not** truncated.

- [x] **Step 5:** `resolveDailyBriefMarkdown`: prefer `openDailyBrief` args / workflow `markdown`. Do **not** rebuild `## New jobs (N)` inventories. If markdown is empty, use a one-line stub, not the old formatter. Update tests.

- [x] **Step 6:** Rebuild core cache after personality / schema changes.

---

### Task 8: Harden + close the spec

**Files:**

- Modify: `docs/superpowers/specs/2026-08-17-today-letter-story-design.md` (status: Implemented / plan link)
- Hardening report per the skill (do not skip)

- [x] **Step 1:** Restart `@tsu-stack/agent` after tools/prompt/core-cache changes.

- [x] **Step 2:** Manual / hardening paths:
  - First Today **waits** on the workflow (not a queued “started” chip like detect/organize).
  - First Today (no cursor) uses ~24h window.
  - Open panel → second Today with no new arrivals → short nothing-new (prove inventory fallback is dead).
  - Mail in window with `summary` leads or groups; `noise` is one closer.
  - Inbox row without take omitted; after take exists, next Today can name it.
  - Tracked quiet rows omitted; a `stage_changed` / `outcome_set` / `promoted` in window appears.
  - Stale remount `opened: false` does not move the cursor.

- [x] **Step 3:** Append hardening `LESSONS.md`. Narrow `vp check` on touched packages.

---

## Execution order

`1 schema → 2 core/skill → 3 persist → 4 land take → 5 workflow+tool → 6 cursor stamp → 7 supervisor/fallback → 8 harden`

Do not implement Task 7 without Task 5 — the supervisor must receive `markdown` from the workflow. Do not ship Task 7 without the fallback fix, or empty letters will still become lists.
