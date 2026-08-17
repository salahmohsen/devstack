# Today letter as a story — design

**Date:** 2026-08-17  
**Author:** Salah  
**Status:** Implemented  
**Plan:** `docs/superpowers/plans/2026-08-17-today-letter-story.md`  
**Surfaces:** Hub Today (`getDailyBrief` → letter → `openDailyBrief` panel), mail classify, New jobs land / inbox-AI take  
**Verification skill:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) (required after implement; append `LESSONS.md`)  
**Glossary:** [CONTEXT.md](../../../CONTEXT.md)  
**Related:**

- [Hub Today + CRM/mail plan](../plans/2026-08-17-hub-today-crm-mail.md) — door stays; this spec **amends** the letter facts and writing
- [Career Mail Assistant](./2026-07-31-career-mail-assistant-design.md) — classify labels; noise is demoted, not deleted
- [Product program map](./2026-08-15-product-program-map.md) — program **5** owns pin/delete mail (still later)
- [New jobs / Tracked](./2026-08-11-new-jobs-tracked-jobs-design.md) — `application_activity` timeline
- [Search brief + hub operator](./2026-08-16-search-brief-hub-operator-design.md) — operator door; Today is not triage

**Does not reopen.** Grill lock from the product owner. Implementation may refine file names, not the frozen table.

---

## 1. Goal

Today is still **only the letter**. The letter is a **story in clean markdown**, not an inventory of the last 8 mails / 8 inbox rows / 8 open tracked jobs.

A **Mastra workflow** (not the hub supervisor) gathers **deltas** (since last successful panel open, else 24h) and writes the letter:

- Neutral one-line **mail summaries** written on classify and stored on the mail row
- New-job **takes** already stored on inbox rows (hydrate-if-thin + take run **on land**, not inside Today)
- Tracked **moves** in that window

The write step leads with what matters, then groups the rest. Empty window → a short “nothing new” letter (no LLM). The supervisor only starts the workflow and opens the panel.

---

## 2. Non-goals

- Replacing `getDailyBrief` / `openDailyBrief` / the side panel door
- Triage card, catalog search, or Find jobs now on a Today turn
- Generating mail summaries or job takes **inside** the Today workflow
- Enqueueing Today as a background hub job (detect/organize style). Same-turn wait only.
- Reading full mail bodies at letter time
- Persisting a finished letter, a personality, or a delete recommendation on the mail row
- **`deleteMail`** / Gmail trash / local hide (program 5; later). The letter may _say_ “consider deleting.”
- Mail swipe, pin, retag (program 4 / 5 titled slots)
- Changing classify system labels
- A second Mastra thread
- Platform-funded LLM keys (classify summary + take stay BYO)

---

## 3. Frozen decisions (grill log)

| #   | Topic          | Decision                                                                                                                                                                                                                                                                      |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Surface        | **Amend**, do not replace. **Workflow** gathers facts + writes the letter in the **current** voice → hub tool returns markdown → `openDailyBrief({ markdown })`. Thread hides the letter. One spoken line. No triage. No catalog. Supervisor does **not** compose the letter. |
| 2   | Window         | Each ask gathers the last **24 hours ending now**. A previous open must not replay a dated letter or empty the next ask.                                                                                                                                                      |
| 3   | Mail in window | All **career** mail with `receivedAt` in the window. Read or unread. Not `system_notification`.                                                                                                                                                                               |
| 4   | Mail summary   | Written **on classify**, same run as labels. One **neutral** sentence (who + what they want). Persist on the mail row. Today reads that field; missing → fall back to `preview`. Never stall the letter.                                                                      |
| 5   | Summary voice  | Neutral facts only. Not a Today paragraph. Labels + `fromName` stay the kind/name. The letter writer does the story in the active character.                                                                                                                                  |
| 6   | New jobs       | Take is **required** to name a job. Thin JD → hydrate listing then take. Thick JD → take only. Runs **on land** (background). Today names only window inbox rows that **already** have `agentTake`.                                                                           |
| 7   | Today vs take  | Do **not** block `getDailyBrief`. Still generating → omit that job this letter. Next Today (cursor) picks it up.                                                                                                                                                              |
| 8   | Tracked        | **Moves only** in the window. Quiet open roles stay out.                                                                                                                                                                                                                      |
| 9   | Delete         | **Later.** Letter may close marketing with “consider deleting.” No delete tool in this change.                                                                                                                                                                                |
| 10  | Story shape    | Clean markdown. **Model** picks who leads (priority hint: CRM labels). Then groups (rule buckets as counts, `noise` as one closer). Not a subject list.                                                                                                                       |
| 11  | Empty          | Still open the panel. Short letter: date + nothing new since last Today / this morning. Do not reprint the previous letter.                                                                                                                                                   |

---

## 4. Key decisions (contracts)

### 4.1 Cursor

Persist `dailyBriefOpenedAt` per `userId` (tenant). **Not** on Better Auth `user` (auth:generate). Prefer a tiny hub-state row (`user_hub_state.userId` PK + timestamp) unless an existing non-auth tenant row is the obvious home in the plan.

Write the cursor **only after** `openDailyBrief` succeeds (panel requested + tool output). Do **not** stamp on `getDailyBrief`. A failed open must not move the window.

Ask-time window: **always last 24 hours ending when they asked** (`rolling24h`). A previous open must not replay a dated letter or shrink the next ask to “Nothing new since 17 August.” Empty → short “Nothing new right now.” Unchanged facts may reuse the last letter (skip the writer).

### 4.2 Mail summary on classify

Add nullable `mail_message.summary` (text, short; cap ~280 chars).

Extend `MailClassifyOutput` with optional `summary`. LLM classify fills it. Heuristic / skip-already-classified: leave null unless the row has no summary yet and the LLM path ran.

`applyClassification` writes labels **and** summary when present. Do not overwrite a non-empty summary on re-classify unless the product later adds an explicit re-summarize.

Update `apps/agent/skills/mail-classification/SKILL.md`: one plain sentence, no voice, no “consider delete,” no Today structure. Who + ask. English unless the mail is not.

Classify failure: labels may still apply; summary stays null; Today uses `preview`.

### 4.3 Today letter workflow

Same-turn (wait), like `classifyMail` — **not** a background hub job.

```text
today-letter-workflow
  1. gather-facts   cursor + windowed mail / inbox-with-take / tracked moves
  2. write-letter   empty → template (no LLM)
                    else → writer agent + hubPersonality from requestContext
```

`getDailyBrief` (keep the id so processors/tests stay wired) **runs this workflow** and returns markdown + facts. It does not dump JSON for the supervisor to turn into a letter.

Register the workflow in `apps/agent/src/mastra/index.ts`. Shared Zod in `@tsu-stack/core`.

Replace “last 8 of each list” with windowed slices **inside gather-facts**:

| Slice                 | Include                                                                                                                                                           | Exclude                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `mail`                | Career mail `receivedAt >= since`. Fields: id, fromName, subject, labels, **summary** (or null), receivedAt                                                       | System notifications, mail before `since`                                    |
| `inbox`               | `trackingStatus = inbox` and `createdAt >= since` (or land time) **and** `agentTake` non-empty. Fields: id, title, companyName, matchScore, **agentTake**         | Stubs still hydrating / take-less rows                                       |
| `tracked`             | `application_activity` in window with kind `stage_changed` \| `outcome_set` \| `promoted`. Fields: application id, company, title, kind, body/metadata, createdAt | `note`, `package_generated`, `dismissed`, `discovered`, roster with no event |
| `empty`               | `true` when all three slices are empty                                                                                                                            | —                                                                            |
| `since` / `dateLabel` | ISO since + human date                                                                                                                                            | —                                                                            |

CRM mail in the window already appears under `mail` (summary + `interview` / `offer` / …). Do not duplicate it as a fake activity row. The writer may weave it into the pipeline beat.

### 4.4 Land: hydrate then take

Today’s land / inbox-AI **skips** AI when the JD is thin. This spec **changes** that for letter-worthiness:

1. Job is kept for inbox (existing two-axis / score gates unchanged).
2. If description is thin and a listing URL exists → hydrate (same markdown-alternate path as listing extract).
3. If description is still thin → leave `agentTake` null (omit from Today).
4. If description is not thin → `generateAgentTake` (existing job). Soft-fail → null take, omit from Today.
5. Insert/keep the inbox row **without** waiting on take when possible; take completes in the same land/inbox-AI job after insert.

Do not enqueue catalog or Find jobs from Today.

### 4.5 Letter writing (workflow step)

The **write-letter** step owns grouping law (not four copies in every voice file):

- The panel is a **letter**, structured markdown (title, short lead, headings). Not a table of subjects.
- **Lead** with what a human should not miss (hint: `interview`, `offer`, `recruiter`, `application`, `application_status`). The model chooses; facts are not pre-filtered.
- Then **groups**: smart-rule buckets as counts (“1 Airbnb inquiry to read”); `noise` as one closer (“N marketing — consider deleting later”).
- Jobs: at most **two** named takes; then “N more in the pile” using `inbox` length vs named. Use the stored take, do not invent a new one.
- Tracked: only the move facts. Applied / interview mail / rejected in prose.
- `empty`: date + one or two sentences that nothing new landed since `since`. **No LLM.** No leftover inventory.
- Writer failure (no BYO, timeout): short fail letter (“Could not write Today. Try again.”), still open the panel. Never rebuild the old inventory.

Hub supervisor Path Today:

1. Call `getDailyBrief` (workflow). Wait.
2. Call `openDailyBrief({ markdown })` with the returned markdown. Do not rewrite it.
3. One spoken line. Do not paste the letter. Do not triage. Do not `findJobsNow`.

Voice files keep Today rhythm (Cairo warm, Dry headings, Coach next-action, Quiet shortest). They do not restate this grouping law. Inject `hubPersonality` on the write step the same way other BYO steps take `requestContext`.

### 4.6 Panel

Existing host (`DailyBriefHost` + `open-daily-brief-tool-ui`). Render the markdown as the letter body (already markdown). Empty letter uses the same chrome. Today still replaces inspect in the same slot.

---

## 5. File map (plan will tick these)

| Area         | Likely touch                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Schema       | `mail_message.summary`; hub cursor timestamp                                                             |
| Core         | `MailClassifyOutput.summary`; classify merge helpers                                                     |
| Classify     | mail-classify workflow + `mail-classification` skill                                                     |
| Land / take  | `inbox-ai.ts` / land hydrate path; `generate-agent-take.ts` (call site only)                             |
| Workflow     | `apps/agent/src/mastra/workflows/today-letter-workflow/` (gather + write); register in `mastra/index.ts` |
| Facts tool   | `get-daily-brief.tool.ts` runs the workflow (same-turn `createRun` + `start`)                            |
| Prompt       | `hub-system-prompt.ts` Today path = run workflow then open panel; write-step prompt in the workflow      |
| Cursor write | `open-daily-brief` client UI after successful open + API to persist                                      |
| Tests        | classify persist; facts window; empty letter; land take-omit; cursor not stamped on getDailyBrief        |

---

## 6. Out of this spec (reminders)

Program **4** inbox chrome and program **5** mail CRM (pin, **delete**, retag, link mail ↔ job) stay titled slots. This spec must not invent swipe or delete execute.

---

## 7. Acceptance (human)

- Second Today the same morning with no new arrivals → short “nothing new,” not the same list.
- A booking request in the window is a named lead (or model-chosen lead) using the **saved** one-liner, not the Gmail subject teaser.
- Marketing in the window is one grouped closer, not N chips.
- An inbox job whose take has not finished does **not** appear; after take lands, the **next** Today can name it.
- Quiet tracked jobs do not appear. A stage/outcome/promoted event in the window does.
- No delete control on the letter.
