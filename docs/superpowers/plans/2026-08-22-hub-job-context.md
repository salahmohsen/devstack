# Hub job context — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plant an Application mention from inspect, force rich job context into hub, close evidence/CRM hub gaps, harden apply-kit, and merge inspect Skills + Agent take.

**Architecture:** Pointer chip (`:application[label]{name=id}`) expands to `application {id}`; processors + `onIterationComplete` force tenant-scoped `getApplication`. Match is deterministic (`classifyJobSkills` + `aliases` + Close families). Apply-kit snapshot stays off master evidence. Hub keeps generate/accept Approval even when Review is off.

**Tech Stack:** Mastra hub-supervisor, assistant-ui Lexical mentions, Drizzle `skill.aliases`, oRPC, existing File Diff / Approval cards, `@tsu-stack/pdf`.

**Spec:** `docs/superpowers/specs/2026-08-22-hub-job-context-design.md`

**Branch:** `feat/hub-job-context` only. Do not commit implementation to `main`.

**Conventions:**

1. End-to-end order: core → db/api → agent → web. UI: **better-ui** + **impeccable** + **coss** + `.agents/ui.md`.
2. Tests only where this plan lists them (spec-required). No e2e unless the harness task.
3. After each task: `vp check` in touched packages. After a PR slice: `vp run -w fix`.
4. Conventional commits, subject ≤72 chars.
5. Tenant `userId` never from tool input.
6. Do not dump JD/kit/mail bodies into the user message.
7. Do not patch project `analysis` from hub.

---

## File map

| Path                                                                                                                                                                     | Role                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `packages/db` stack schema + migration                                                                                                                                   | `alternative_names` → `aliases` |
| `packages/core` skill types, `classifyJobSkills`, `CLOSE_SKILL_FAMILIES`, `HubGetApplicationOutputSchema`, evidence superRefine, ranker, job preference `reviewApplyKit` |
| `packages/api` mappers, applications get/update, kit replace, prefs                                                                                                      |
| `apps/agent` tools, processors, supervisor loop, apply-package assemble                                                                                                  |
| `apps/web` inspect, floater, mention plant, match chips, Avoid, kit review setting                                                                                       |
| `packages/pdf` headline override                                                                                                                                         |

---

### Task 1: Aliases rename (PR 1a)

**Files:**

- Modify: `packages/db/src/schema/stack.schema.ts` (`alternativeNames` → `aliases`, column `aliases`)
- Generate: Drizzle migration renaming `alternative_names` → `aliases` on the live **skill** table (confirm table name in latest migrations; do not ALTER the old `"stack"` table)
- Modify: all `alternativeNames` call sites in `packages/core`, `packages/db` repos, `packages/api`, `apps/agent`, `apps/web` (stack form label **Aliases**)
- Dual-key parse for in-flight organize-stacks payloads: read `aliases ?? alternativeNames`, write only `aliases`

- [ ] **Step 1:** Grep `alternativeNames` / `alternative_names` and rename every product call site.
- [ ] **Step 2:** Schema + `vp run db:generate`. Check `DATABASE_URL` is local before `vp run db:migrate`.
- [ ] **Step 3:** `vp check` in `packages/db`, `packages/core`, `packages/api`, `apps/agent`, `apps/web`.
- [ ] **Step 4:** Commit `refactor(skills): rename alternativeNames to aliases`

---

### Task 2: Classifier + inspect merge (PR 1b)

**Files:**

- Create: `packages/core/src/job-discovery/skill-match.ts` — `classifyJobSkills({ jobSkills, held: { name, aliases }[] })` → `{ have, close, missing, percent }`
- Modify: `packages/core/src/application/job-skills.ts` — export `CANONICAL_SKILL_ALIASES`; add `CLOSE_SKILL_FAMILIES` (AWS/GCP/Azure, React/Vue/Angular, **JS↔TS**)
- Modify: `packages/core/src/job-discovery/skills-overlap.ts` — delegate to classifier for exact Have if still used
- Test: `packages/core/src/job-discovery/__tests__/skill-match.test.ts` matrix from spec §19
- Modify: `apps/web/src/shared/ui/job-card-marks.tsx` — Close (warning) tone; `held` props
- Modify: `application-info-panel.tsx` — merge Skills + Agent take; pass `{ name, aliases }[]`; stop `map(name)` drop
- Dashboard **I have it**: Close = toast no-op. Missing + catalog = combobox over `stacks.list` then silent `stacks.update({ aliases: [...existing, token] })`. Empty catalog = not alias path. Preselect only exact normalize match or unique canonical table hit (`Java` ↛ `JavaScript`). No hub Confirm.

- [ ] **Step 1:** Implement `classifyJobSkills` + tests.
- [ ] **Step 2:** Wire inspect merge (better-ui chips, progress, take bullets).
- [ ] **Step 3:** Alias picker on Missing (combobox). Optional undo toast reverting the alias array.
- [ ] **Step 4:** `vp check` core + web. Commit `feat(jobs): Have/Close/Missing match chips`

---

### Task 3: Avoid → excludeKeywords (PR 1c)

**Files:**

- Inspect Avoid on Missing/Close chips → `jobPreference.upsert` append `excludeKeywords` + sonner undo that removes the tag
- Existing prefs upsert already invalidates search brief
- Test: `applyPreferenceHardFails` hits the new keyword

- [ ] **Step 1:** Avoid action + undo toast.
- [ ] **Step 2:** Strike-through avoided chips using current exclude list.
- [ ] **Step 3:** `vp check` web + core. Commit `feat(jobs): Avoid chip writes excludeKeywords`

---

### Task 4: Application mention plant + floater (PR 2, web)

**Files:**

- `hub-assistant-open.ts` — `requestHubApplicationMention({ id, title, companyName })`, plant seed `{ directive, extraTypedText }`, rehearsal string **with braces** `application {id}`
- Persist seed until **send** or composer **clear**; `snapshotHubApplicationPlant(extraTypedText)` on floater unmount so Expand remount re-applies typed text
- Consume seed after successful send (first-message-only; not sticky)
- Test: live rehearsal template matches `APPLICATION_MENTION_RE`
- `hub-chat-provider.tsx` — `startNewChat` then plant after `historyReady`; **do not send**; re-apply after remount / Expand
- `hub-directive-expand.ts` — `type === "application"` → `application {id}`
- Composer chips: `application` icon (Briefcase)
- `hub-assistant-modal.tsx` — Expand (Link `/dashboard`) next to Close; z-index above inspect Sheet (`z-50`); keep `xl:right-145` when `hasContent`
- `agent-hub-thread.tsx` — `variant?: "floater"` unsets rail
- `application-info-panel.tsx` — Open in agent on discovery + tracked

Use ctx7 for assistant-ui Lexical `setText` / composer plant if the helper is unclear: library `@assistant-ui/react`.

- [ ] **Step 1:** Expand + plant APIs + tests.
- [ ] **Step 2:** Floater chrome.
- [ ] **Step 3:** Inspect buttons.
- [ ] **Step 4:** `vp check` web. Commit `feat(hub): plant Application mention in floater`

---

### Task 5: Force getApplication + full getProject + notes (PR 2, agent)

**Files:**

- `HubGetApplicationOutputSchema` in core — omit R2 keys, draft JSON, fitAnalysis, legacy `notes`, mail bodies
- **Tests:** schema rejects `coverLetterR2Key`, `r2Key`, `applyPackageDraft`, `fitAnalysis`, `notes`
- `get-application.tool.ts` — four repos; filename only for resume. After `packages/core` export: `rebuild:core-cache` so agent sees the schema
- `get-project.tool.ts` — full analysis/summary/description; drop excerpt
- `add-application-note.tool.ts` — silent; tenant from context
- **New** `HubApplicationMentionProcessor` registered in `createHubInputProcessors` (Today/stacks processors return early when _their_ need is false — flags alone do not set `activeTools` on a mention-only turn)
- Processors: `HubForcedReadFlags.application`, `anyHubForcedRead` must OR application, `isGetApplicationToolName`, union filter, EnsureFinal exception
- Sparse log `hub_application_mention_loaded` (no JD body) per spec §17 / `.agents/logging.md`
- `hub-supervisor.ts` `onIterationComplete` — `messagesNeedGetApplication` like search-brief (feedback `HUB_APPLICATION_MUST_LOAD_FEEDBACK`, one text-only retry)
- `shouldStopAfterTodayLetter` / `shouldStopAfterStackCatalog` false while mention gather pending
- Prompt: job-context path; do not speak analysis; rehearsal braces
- `propose-evidence-change.tool.ts` description: forbid patch.analysis
- Tests listed in spec §19 agent bullets
- Register note tool; invalidate applications on hub note

- [ ] **Step 1:** Schemas + getApplication + getProject + note tool.
- [ ] **Step 2:** Processors + loop stopper + tests.
- [ ] **Step 3:** `vp check` core + agent. Commit `feat(hub): force getApplication and full getProject`

---

### Task 6: CRM write parity + evidence delete + analysis schema (PR 3)

**Files:**

- Hub tools: restore **silent only on explicit user ask** (never infer from company-status read), setOutcome Confirm, delete application Confirm, delete note Confirm, update fields Confirm File Diff, batch via Confirm then **per-id** existing tools (no `batchTrack`)
- Wire every new tool: `hub-supervisor.ts` + `mastra/index.ts`, `hub-tool-names.ts`, `HUB_CLIENT_HITL_TOOL_NAMES`, `HUB_CLIENT_RESUME_TOOL_NAMES`, `hub-assistant-toolkit.tsx`, `HUB_APPLICATION_MUTATING_TOOLS` / `use-invalidate-applications-on-hub-tools.ts`
- `HubPostEvidenceConfirmProcessor` / `messagesHaveEvidenceOrHardStopResultThisTurn` must treat application-field and other new Confirms like evidence (no same-turn `listNewJobs` / triage)
- `hub-system-prompt.ts` inventory lists the new CRM tools
- `proposeEvidenceChange` `op: delete` Confirm
- `ProposeEvidenceChangeInputSchema` superRefine: fail if any patch key matches `/analysis/i`
- `projectPatchGroundedInAnalysis` must **not** use `patch.analysis` as basis
- Inspect **I have it**: phrase → hub `proposeEvidenceChange`; empty catalog / unknown tool → create-skill Confirm (Task 2 only ships alias picker)

- [ ] **Step 1:** Schema fail-closed analysis.
- [ ] **Step 2:** Evidence delete Confirm.
- [ ] **Step 3:** CRM tools + HITL cards.
- [ ] **Step 4:** `vp check` core + agent + web. Commit `feat(hub): CRM write parity and evidence delete`

---

### Task 7: Apply kit hardening (PR 4)

**Files:**

- Job preference `reviewApplyKit` boolean default **true** (schema + settings island)
- Dashboard generate: if off, skip review sheet, still generate+accept **from the button**
- Hub: **keep** `requireToolApproval` on generate **and** accept always
- Snapshot tweaks + File Diff vs master; `draft.headline` → `cv.headline`
- Ranker in core (recency + overlap; never hide current role)
- Auto-hide whole items **only when Review is off**; Review on = human include flags
- Kit replace in **both** `packages/api/src/lib/application/accept-apply-package.ts` and `apps/agent/src/mastra/lib/accept-apply-package.ts`: PUT new resume+cover, commit DB, **then** delete old resume row+object and old cover; fail closed leave old kit
- Application `delete` must also delete kit resume objects when `prompt` is `apply-package:{id}`
- Assemble no longer forces every `include: true` as the PDF truth when Review is off
- Snapshot fields: `jdBuckets`, `keywordDualForms`, optional `atsVendor`; update `apps/agent/skills/application-apply-package/SKILL.md`
- Sparse logs `apply_kit_replaced`, `apply_kit_pdf_include` (spec §17)
- Tests from spec §19: ranker never hides current role; Review-on leaves human include flags; fail PUT keeps old resume downloadable; `draft.headline` → `cv.headline`

- [ ] **Step 1:** Pref column + settings toggle.
- [ ] **Step 2:** Snapshot tweak + headline YAML + File Diff + skill/research fields.
- [ ] **Step 3:** Fail-closed kit replace (both accept copies + application delete).
- [ ] **Step 4:** Ranker + review-off hide + unit tests (current role, Review-on flags, fail-PUT).
- [ ] **Step 5:** `vp check` + `vp run -w fix`. Commit `feat(jobs): apply kit review setting and snapshot tweaks`

---

### Task 8: Verify + harness

- [ ] `vp run -w fix`
- [ ] React Doctor skill / script on web
- [ ] Formatting
- [ ] [ai-feature-harness](.agents/skills/ai-feature-harness/SKILL.md) for hub mention / kit / evidence delete; append `LESSONS.md`
- [ ] Push `feat/hub-job-context`; watch CI, grok review, react-doctor; fix; repeat until green
