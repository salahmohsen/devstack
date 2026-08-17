# Hub operator: Today letter, faces, CRM-from-mail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Checkbox steps are the work list.
>
> **REQUIRED after implementation:** [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) — fresh loop on hub Thread + floater, append `LESSONS.md`, write the report. Everyday language only.

**Grill date:** 2026-08-17. This file is the single lock for two sessions: CRM/mail/find-jobs, then Today + characters.

**Implementation started 2026-08-17.** GitHub MCP is parked — not in this plan.

---

## Goal

Hub chat can (1) resolve a **company** across tracked / New jobs / mail and Confirm writes, (2) treat **find jobs** as inbox first and catalog only on request, (3) show a **Today** letter in the side panel in the current character’s voice, (4) show that character in the composer and on each assistant message, (5) run one shared **role** prompt for the product and four distinct **voices**.

---

## Locked decisions

### Company / stage (not find-now)

“What’s Trivelta’s stage, and search” means: search **tracked**, **New jobs**, and **all mail**. It is not `findJobsNow`.

| Mail kind                            | Path                                                      |
| ------------------------------------ | --------------------------------------------------------- |
| `application` / `application_status` | Stage timeline. Typical write: **applied**                |
| `recruiter` / `interview` / `offer`  | Stage timeline. Map: screening / interview / offer        |
| `job_notifier`                       | No stage write. Extract **that listing only** if they ask |

Same job = company + title, or listing URL. Two titles = two rows. One open Trivelta row and mail has no title → that row.

Source of truth = **latest CRM mail** (not a later digest). Newer screen/reject beats older applied. A digest does not cancel a receipt. Those are different mails.

Unsorted latest **mention**: same-turn classify, visible step, wait for labels. Chat-started classify = **labels only** (do not run `applyMailCrmEffect` on that message). After labels, compare to the board.

Writes only when the board would change. Confirm is the write.

- Receipt + inbox row → track + applied
- Receipt + no row → Confirm **creates** tracked + applied
- Already matches mail analysis → **speak the stage, no card**
- Latest CRM mail is rejection → Confirm **close** (`outcome = rejected`), freeze stage. Board has no Rejected column
- `sendApplyOutreach` stays the only **silent** applied path

### Find jobs (the other sentence)

Do not teach “shared pool” vs “New jobs.”

1. `listNewJobs` first.
2. If inbox has rows: speak / triage those. Catalog waits for “look for more.”
3. If inbox is empty **and** they asked to find jobs: warn it can take a few minutes, then enqueue `findJobsNow`.
4. Catalog is **request-only**. Queue and land; do not wait in the thread.
5. No loading toast on the **chat** enqueue. Inline “Search is queued.” New jobs **header button** still has pill + toast.

Packed “stage + go find jobs”: speak CRM first, then enqueue if they asked to look further. Hide wrap-up after enqueue.

### Thread / leftover HITL

One thread (`dashboard-home:{userId}`).

- **Clear pending:** cancel waiting cards, keep memory.
- **Remount:** cancel **stale** waiting cards (not on the latest assistant message). Keep the latest Confirm. Reload is not discard.

### Today letter

“What do you have for me today?” (and the same idea) is **only** the letter.

- Supervisor writes markdown in the **current** character voice from gathered facts (New jobs, recent mail, tracked).
- `openDailyBrief({ markdown })` opens the side panel. Thread **hides** the letter. One short spoken line.
- No triage card. No catalog search.
- If inspect is open, **Today replaces it** (same slot).

### Characters / avatars

- Composer shows the character (Cairo / Dry / Coach / Quiet) next to the model. Can change it there.
- Composer and Settings → AI stay in **sync**.
- Each assistant message stores `hubPersonality` in **Mastra memory** (same idea as `createdAt`). Hydrate paints that face. Missing field → Cairo.
- User messages use the profile photo.

### Role prompt vs character voice (added 2026-08-17)

Research (Anthropic context engineering, OpenAI instruction roles, character-voice craft):

- **Split the brain from the mouth.** One system prompt is the role (what this app is, what you may do). Personality is a separate overlay (how you talk). Same tools, four mouths.
- **Right altitude.** Sections with headers. Specific enough to steer, not a brittle if/else novel. Minimal high-signal tokens (context rot is real).
- **Voice is not adjectives.** Each character needs sentence length, vocabulary, humor yes/no, what they never do, and 1–2 canonical examples. At most one verbal tic. “Be helpful” produces the same generic assistant four times.
- **Do not copy product rules into every voice.** The current files paste the same domain glossary into Cairo, Dry, Coach, and Quiet. That wastes tokens and lets voice fight role.
- **The supervisor still hardcodes Cairo.** That fights the overlay. Remove it. Point at the injected character.

**Lock:** rewrite the four voices so they actually sound different. Rewrite the supervisor `instructions` into a structured **role** prompt (product offerings + locks). Personality files become voice-only. Today letters use the active voice.

| Character           | Talks like                                                                                              | Today letter                                |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Cairo** (default) | Warm, short, one dry Egyptian-cool smile. Help first. Never standup, never slang that needs a footnote. | Warm recap, one wry closer.                 |
| **Dry**             | Clipped. Facts, then stop. Almost no jokes. Can sound blunt.                                            | Headings and bullets. No flourish.          |
| **Coach**           | Next action first. Encouraging, not a pep rally. Number steps when it helps.                            | Open with what to do today, then the facts. |
| **Quiet**           | One or two sentences. Tools do the talking. No preamble.                                                | Shortest possible letter. No greeting.      |

Each voice brief includes: rhythm, words they use / avoid, humor rule, never-do, how they write Today, two example replies (same ask, four answers).

---

## Already shipped (this branch) vs must edit

| Piece                                                                                        | Status                                                                        |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Composer character picker + Settings sync                                                    | Shipped. Keep.                                                                |
| Assistant + user avatars in the thread                                                       | Shipped. Keep layout.                                                         |
| Browser stamp of personality on stream                                                       | **Replace** with Mastra metadata (lock B).                                    |
| `getDailyBrief` voiceless snapshot + open panel                                              | **Replace** with facts + supervisor letter + `openDailyBrief`.                |
| Today yields to leftover inspect                                                             | **Fixed in UI** (Today clears inspect). Keep.                                 |
| CRM-from-mail Confirm, classify-wait, catalog-on-request, remount keep-latest, no chat toast | **Not built.** This plan.                                                     |
| Role prompt + four distinct voices                                                           | **Not built.** Current voices share one glossary; supervisor hardcodes Cairo. |

Restart `@tsu-stack/agent` after new tools or the model will not see them.

---

## Architecture

**Today**

1. Server (or client) **facts** tool: inbox rows, recent mail (id, subject, labels, date), tracked open (company, title, stage). Short structured JSON. No letter.
2. Supervisor writes the letter (personality already on `requestContext`).
3. Client HITL `open-daily-brief` (no execute): args `{ markdown }`. Opens panel, `addToolOutput`, hide text after this part.
4. Prompt: after this tool, one spoken line, no paste, no `listNewJobs` triage, no `findJobsNow`.

**Personality on messages**

- `chatStream` already accepts `hubPersonality` and puts it on `requestContext`.
- On stream / persist, set `metadata.hubPersonality` on the assistant UI message.
- `attachCreatedAtToUiMessages` (or sibling) copies it on hydrate from Mastra rows the same way as `createdAt`.
- Thread render: `metadata.hubPersonality` first, then local stamp, then Cairo.

**CRM-from-mail** (new)

- Mail search by company (extend `listMail` or add `searchMail`). Read all hits.
- Classify the latest **mention** if unsorted (sync wait, labels only).
- Stage from latest **CRM-labeled** mail. Notifier ignored for stage.
- New Confirm card family: one company+title (or URL). Actions: track+applied, create+applied, close rejected, or other mapped stage. Confirm writes on the client.
- Worker `applyMailCrmEffect` stays for **background** Gmail/classify. Chat-started classify must not double-write.

**Find-now chat path**

- `enqueueFindJobsNow` skips `showRunningToast`. `startFindJobsNow` (header) keeps toast + pill.
- Supervisor: inbox first; catalog only on explicit look-further.

**HITL remount**

- On first hydrate, auto-complete-as-cancelled waiting Confirm cards that are **not** on the last assistant message.
- Latest waiting card stays.
- Clear-pending control cancels that one too.

---

## File map

| Area                   | Work                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Today facts            | Split or replace `apps/agent/src/mastra/tools/get-daily-brief.tool.ts` (facts only). New `open-daily-brief.tool.ts` (HITL, markdown in).                                                                                                               |
| Today UI               | `get-daily-brief-tool-ui.tsx` → open from `openDailyBrief` result/args. Keep `daily-brief-host-store.ts` + `daily-brief-host.tsx`.                                                                                                                     |
| Role prompt            | New `apps/agent/src/mastra/lib/hub-system-prompt.ts` (or equivalent). Sections: Role, What this app is, How people talk, How you work, Paths, Meta. No hardcoded Cairo. Supervisor `instructions` call this.                                           |
| Character voices       | Rewrite `packages/core/src/ai-settings/hub-personality.ts`. Voice-only. Drop shared glossary from each prompt (lives in the role prompt). Distinct rhythm + Today letter rules + two examples each. Update Settings taglines if the one-liners change. |
| Policy / resume        | `open-daily-brief` client HITL, hide-after, no auto-resume. Not a composer lock.                                                                                                                                                                       |
| Personality persist    | `packages/api/src/routers/agent.list-hub-messages.ts` attach `hubPersonality`; stream/chat path write metadata; `hub-message-personality.ts` reads metadata first.                                                                                     |
| Composer / settings    | Keep picker + `aiSettings.update`. Pass `hubPersonality` on `chatStream` (already).                                                                                                                                                                    |
| Mail search            | `list-mail.tool.ts` query **or** `search-mail.tool.ts`.                                                                                                                                                                                                |
| Classify wait          | Hub tool that runs classify and **returns labels**, no CRM apply. Visible step.                                                                                                                                                                        |
| Applied-from-mail card | New propose tool + toolkit card. Client Confirm: track/create/`applied` or outcome rejected. Amend hub stage guard for this card only (not silent `updateApplicationStage`).                                                                           |
| Find-now toast         | `find-jobs-now-job.tsx`: toast only when `awaitPoll` / header `startFindJobsNow`.                                                                                                                                                                      |
| Remount                | Hub hydrate: cancel stale waiting HITL; keep latest.                                                                                                                                                                                                   |
| Docs                   | This plan. Append a short row to hardening `tool-gaps.md` when a gap ships.                                                                                                                                                                            |

**Do not:** jal-co; apply tools; silent `applied` from `updateApplicationStage`; catalog enqueue on Today; chat loading toast; second Mastra thread; new core export without `rebuild:core-cache`.

---

## Implementation order

1. **Role prompt + four voices** (split brain/mouth; remove supervisor Cairo default; rebuild:core-cache if core personality strings are imported by the agent).
2. **Today letter flow** (edit shipped snapshot → facts + `openDailyBrief` + hide letter + Today replaces inspect).
3. **Mastra `hubPersonality` on messages** (hydrate faces).
4. **Find-now:** no toast on chat enqueue; prompt inbox-first / catalog-on-request.
5. **Remount keep-latest** + Clear pending.
6. **Mail search + classify-wait (labels only).**
7. **Confirm card:** track/create/applied and rejected close.
8. Hardening report + `LESSONS.md`.

---

## Test seams (requested with this plan)

- Hide-after `openDailyBrief` / no resume.
- Hydrate attaches `metadata.hubPersonality`.
- Chat enqueue does not call `showAiJobRunningToast`.
- Remount: stale HITL cancelled, latest kept.
- Stage map: notifier never applied; latest CRM mail wins; create+applied only from `application` / `application_status`.
- Confirm rejected sets outcome, does not invent a stage.
- Four voices: same Today facts, four recognizably different letters. Supervisor `instructions` contain no hardcoded Cairo.

After ship: one live thread, new persona, score the packed asks (Today, a company name, find jobs, leftover card after reload).
