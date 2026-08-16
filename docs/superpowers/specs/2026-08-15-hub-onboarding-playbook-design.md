# Hub onboarding playbook — Design

**Date:** 2026-08-15  
**Status:** Ready for plan (grill locked; spec review approved)  
**Goal:** Hub chat is a second door into the same onboarding/config modules. Slices are first-class tools. Full setup is a playbook (skill + reminder), not a second wizard or Mastra workflow.

**Related**

- Program map — `2026-08-15-product-program-map.md`
- Onboarding hardening — `2026-08-15-onboarding-hardening-design.md` (page machine, merge, AI skip)
- Shared contracts — `2026-08-15-shared-integration-contracts-design.md` (catalog cards)
- Hub HITL — `2026-08-11-hub-agent-tools-hitl-design.md` (**re-opens** “onboarding out of v1 tools”)
- Wave 0 extract — `../plans/2026-08-15-onboarding-extract-and-save-reset.md`
- HITL card family — `2026-08-15-hub-hitl-card-family-design.md` (shared frame; playbook cards mount it)

**Mastra (verified 2026-08-15)**

| Primitive                                         | Use                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Server `createTool` **without** `execute`         | HITL cards; loop suspends; UI resumes via AI SDK `addToolOutput` (same as `propose-application-from-jd`) |
| Filesystem / `createSkill` on hub-supervisor      | Playbook order + wait rules                                                                              |
| Existing `resumeImportWorkflow` (background tool) | The only extract engine                                                                                  |
| `<system-reminder>`                               | Quick action / onboarding intent injects “run the skill now”                                             |
| Hub input processor                               | Treat new HITL names as pending cards (no forced last-step summary)                                      |
| Workflow for the loop                             | **No**                                                                                                   |
| `requireApproval` on form tools                   | **No**                                                                                                   |
| `@mastra/client-js` `createTool`                  | **No**                                                                                                   |

**UI skills:** coss, impeccable (operate), existing hub HITL cards, [assistant-ui tools](../../../.agents/skills/tools/SKILL.md). Reuse catalog / job-preference / upload modules. Mount playbook cards on the 3c HITL frame. **app-ai-feature-hardening** after ship.

---

## Problem

1. Hub can already run `resumeImportWorkflow` in the background but cannot walk setup or show Gmail/Resend/AI cards in the thread.
2. Users want **slices** (“experiences only from this CV”, “change my website”, “connect Gmail”) without the full wizard.
3. Any flow that lacks a required integration should stop on the **same** catalog card, not only onboarding.
4. A second in-chat wizard would fork the page we are hardening.

---

## Product decisions (grill lock)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chat is a **second door**. `/dashboard/onboarding` stays. Same session, same apply, same catalog.                                                                                                                                                                                                                                                                                                                                                 |
| 2   | **Slices first.** Playbook is those slices in a fixed order.                                                                                                                                                                                                                                                                                                                                                                                      |
| 3   | Playbook starts only on **onboarding intent**: quick action **Onboarding**, or utterance that means first-run / “set me up” / “import my resume and finish setup.”                                                                                                                                                                                                                                                                                |
| 4   | Slice utterances do **not** start the playbook. One tool, then stop.                                                                                                                                                                                                                                                                                                                                                                              |
| 5   | Missing AI / Gmail / Resend / GitHub → **hard-gate** shared catalog card. Same skip rules as the page. Cannot skip and still extract / sync / send / detect.                                                                                                                                                                                                                                                                                      |
| 6   | One extract. Slice = **selection mask** on Apply (unchecked kinds). Profile always applied.                                                                                                                                                                                                                                                                                                                                                       |
| 7   | PDF upload is a **dropzone on the extract HITL card**. Hub composer stays `attachments={false}`. Same files-sdk `resume-sources/`.                                                                                                                                                                                                                                                                                                                |
| 8   | After extract: **compact confirm** card — Apply / Edit on page / Skip resume. Full review stays on the page.                                                                                                                                                                                                                                                                                                                                      |
| 9   | Five HITL tools + thin `start-resume-extract` execute. **No** `runOnboarding`. **No** playbook workflow.                                                                                                                                                                                                                                                                                                                                          |
| 10  | After the card has `objectKey`, the agent calls a **thin execute tool** (`start-resume-extract`) whose only input is `{ objectKey, filename? }`. Server does what `onboarding.extract` already does (download PDF → text, `resolveRuntimeAiCredentials`, same `resumeImportWorkflow`). **Never** pass `resumeText` or `llm` to the model. **No** `requireToolApproval` on this start (user already clicked Analyze). Then `confirm-resume-apply`. |
| 11  | Hub extract/apply **writes the same onboarding session store** as the page (`objectKey`, draft, step). Edit on page and Apply/Skip share that session.                                                                                                                                                                                                                                                                                            |
| 12  | `configure-integration` `{ target: "ai" }` is configured only when the **page valid-AI predicate** is true. The card’s save **bind-all** (every feature → that provider + `pickProbeModelId`). Not a raw Settings save.                                                                                                                                                                                                                           |

---

## Tools

All registered on hub-supervisor. Zod contracts in `@tsu-stack/core`. HITL tools: **no `execute`**.

**Search-loop amendment (2026-08-16):** Spoken job-preference edits in the Career search loop must not call `upsert-job-preferences`. That tool stays **onboarding 3b only**. Search-loop writes are defined in [search brief + hub operator](./2026-08-16-search-brief-hub-operator-design.md). Do not rewrite this playbook grill.

| Tool id                  | Execute?         | Card                                                                                    | Completes with                                                                                                                                                                                                                                                 |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configure-integration`  | no               | Same catalog / AI configure as Settings. Input: `gmail` \| `resend` \| `github` \| `ai` | `{ ok, skipped?, configured }`                                                                                                                                                                                                                                 |
| `extract-resume`         | no               | Upload + Analyze / Skip. Optional `slice: ("experiences" \| "projects" \| "stacks")[]`  | `{ objectKey, filename, slice }` or `{ skipped: true }`                                                                                                                                                                                                        |
| `start-resume-extract`   | **yes** (server) | Pending tool = analyzing (reuse extract toast; do not start `startExtractResumeJob`)    | `{ ok, unusable, draft? }` — **one** extract                                                                                                                                                                                                                   |
| `confirm-resume-apply`   | no               | Compact: filename, counts, mask, warnings. Apply / Edit on page / Skip                  | `{ action: apply \| edit \| skip }`                                                                                                                                                                                                                            |
| `upsert-job-preferences` | no               | Same `JobPreferenceFields`                                                              | `{ ok, skipped? }` — client calls existing upsert. **Onboarding 3b only.** Search-loop spoken prefs must not call this tool — they use [search brief + hub operator](./2026-08-16-search-brief-hub-operator-design.md) (soft upsert + hard-stop confirm card). |
| `update-profile-contact` | no               | Type + value confirm                                                                    | `{ ok, type, value }` or `{ cancelled }`                                                                                                                                                                                                                       |

`update-profile-contact` is **slice-only**. It is not a playbook step.

**Extract handshake (one run, no double job):**

1. Analyze on the card: upload done → write `{ objectKey, filename, slice }` into the session → `addToolOutput` on `extract-resume`. Do **not** call `startExtractResumeJob`.
2. Agent calls `start-resume-extract({ objectKey, filename })`.
3. Server `execute` is **agent-local parity of `onboarding.extract`** (same idea as `generate-apply-package` — do **not** import `@tsu-stack/api` into the Mastra bundle). Download → text → resolve BYO llm → `resumeImportWorkflow`. Blocks until the draft exists. Never put `llm` in the model-visible input.
4. Tool **output to the model** is `{ ok, unusable, counts? }` only. Full `draft` rides on the tool part for the **toolkit** to write session (not dumped into memory as the model result). Toolkit: session `draft` + `step: "review"` + slice mask. Confirm **reads the session**.
5. If `unusable` or `meta.unusableExtract`: stay on extract/retry; agent must **not** call `confirm-resume-apply`.
6. Page Analyze still uses `startExtractResumeJob` only. Hub never starts that job for the same `objectKey`.

**Apply / Skip / Edit** all go through that session:

- **Apply:** client calls existing `onboarding.apply` with session draft (mask already applied as `selected: false` on non-slice kinds). Then `addToolOutput({ action: "apply" })`. First-run slice Apply **does** set `onboardingCompletedAt` (same mutation).
- **Skip:** same as page skip if they skip resume; `addToolOutput({ action: "skip" })`.
- **Edit:** `openSurface` **only** `/dashboard/onboarding` (review). Gmail/GitHub in-thread OAuth `callbackPath` is `/dashboard` (hub remount), not `?step=connect`. After remount, the pending card re-reads catalog.
- After hub **Apply**, match the page: clear draft, session step `jobs` (playbook continues). Do not leave review sitting in the store.

`should-auto-resume-hub-chat` must resume on these outputs (`objectKey`, `apply` / `edit` / `skip`, `{ ok }`), not only today’s `confirm` \| `package` \| `save`.

---

## Playbook (skill, not a workflow)

Add `apps/agent/skills/onboarding-playbook/SKILL.md` and attach the path on hub-supervisor (`skills-paths.ts`).

**When to load:** first-run setup, “set me up”, import resume and finish, quick action Onboarding.

**Order:**

1. If AI invalid → `configure-integration` `{ target: "ai" }`. Skip → continue without analyze.
2. `extract-resume` (full mask unless the utterance named a slice).
3. On `objectKey` → `start-resume-extract` (wait for `{ ok, unusable, draft }`) → if usable → `confirm-resume-apply`.
4. `upsert-job-preferences` (prefill empty fields only — page spec).
5. For each unconfigured **available** catalog item → `configure-integration`.
6. Short text only after the last card completes. **Zero user-facing text** while a HITL card is open (same as triage).

Quick action / classified intent injects:

```xml
<system-reminder>Onboarding playbook: follow onboarding-playbook skill. One HITL tool at a time. Do not skip a missing-config card. Do not start this playbook for a single-slice request.</system-reminder>
```

Hub already treats those tags as law.

---

## Missing-config guard (any flow)

Not only the playbook. Before:

| Intent                   | Need                                          | Card                         |
| ------------------------ | --------------------------------------------- | ---------------------------- |
| Extract / analyze resume | Valid AI (`hasApiKey` + `resumeImport` bound) | `configure-integration` `ai` |
| Sync / read Gmail        | Gmail scopes                                  | `gmail`                      |
| Send via Resend          | Tenant Resend key                             | `resend`                     |
| Detect private repos     | GitHub OAuth                                  | `github`                     |

Use shared predicates from spec 1 (`catalogItemState` / catalog hide column) and the onboarding **valid AI** rule (`hasApiKey` + `resumeImport` bound to a live provider).

---

## Hub UI

- Register HITL tools in `hub-assistant-toolkit` like `propose-new-jobs-triage`. `start-resume-extract` has no card (server execute).
- Connect / AI cards **import** `ConnectionsIntegrations` / provider configure — no new markup.
- Extract card embeds existing onboarding upload.
- Prefs card embeds `JobPreferenceFields`.
- Confirm card is new but small (counts + three actions).
- Add HITL tool names to `isHubClientHitlToolName` / processor wait-list / `should-auto-resume-hub-chat`. **Do not** treat `start-resume-extract` as client HITL — it is a server execute; the loop continues in the same turn. `{ ok }` auto-resume is for configure / prefs cards only.
- Analyzing UI = pending `start-resume-extract` (reuse toast copy). Not `startExtractResumeJob`.
- Composer `attachments={false}` stays.

---

## Non-goals

- Replacing `/dashboard/onboarding`
- Full review editor in the bubble
- Composer paperclip
- Second extract schema / experiences-only model
- Dedicated onboarding agent
- Featured-stack / type-inference (page extract follow-up, not this spec)

---

## Files (expected)

| Area         | Where                                                               |
| ------------ | ------------------------------------------------------------------- |
| Core schemas | `packages/core/src/onboarding/` or `hub/`                           |
| Tools        | `apps/agent/src/mastra/tools/configure-integration.tool.ts` etc.    |
| Skill        | `apps/agent/skills/onboarding-playbook/SKILL.md`                    |
| Register     | `apps/agent/src/mastra/index.ts`, hub-supervisor `tools` + `skills` |
| HITL UI      | `apps/web/src/features/agent-hub/ui/`                               |
| Reminder     | Hub chat send path / home quick action                              |

---

## Testing + hardening

- Slice request does not inject playbook (one tool).
- Quick action injects reminder and agent calls configure/extract in order.
- Missing AI + extract → AI card first; skip → no workflow call.
- Extract card upload → workflow → confirm → apply writes only selected kinds.
- Gmail card in chat is the same component as Settings.
- Processor does not force a summary while a config/confirm card is pending.
- After ship: **app-ai-feature-hardening** (playbook + slice + missing-config). Append `LESSONS.md`.
