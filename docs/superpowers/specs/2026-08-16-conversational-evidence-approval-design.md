# Conversational evidence + approval File Diff — design

**Date:** 2026-08-16  
**Author:** Salah  
**Status:** Implemented (Tasks 1–9). Plan: [2026-08-16-conversational-evidence-approval.md](../plans/2026-08-16-conversational-evidence-approval.md). Hardening (Task 11) still required.  
**Surfaces:** Hub chat (`/dashboard` + floater), evidence inspect side panel, list `+`, hard-stop / search-brief File Diff  
**Verification skill:** [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) (required after implement; living lessons in that skill’s `LESSONS.md`)  
**Glossary:** [CONTEXT.md](../../../CONTEXT.md)  
**Related:**

- [Search brief + hub operator](./2026-08-16-search-brief-hub-operator-design.md) — **this spec supersedes KD 7** (open original forms in `EntityFormSheet` for hub evidence writes) and the glossary line “evidence create/edit confirm in the entity form panel”
- ADR [0025](../../adr/0025-entity-form-sheet.md) — still owns **inspect** chrome (not human edit)
- [Hub HITL card family](./2026-08-15-hub-hitl-card-family-design.md)
- [Career Inbox + AI platform](./2026-07-29-career-inbox-ai-platform-design.md)

**Does not reopen.** Grill lock from the product owner. Implementation may refine file names, not the frozen table.

---

## 1. Goal

Human writes to **resume evidence** (project, experience, stack) happen only in **hub conversation**: the agent finds the row, interviews until required goals are filled, then opens one **ApprovalCard** whose body is a **beUI File Diff** of current vs proposed. Confirm persists on the client. No edit form. No side-panel write.

Inspect stays, as a **shared shell** with kind-specific bodies. Dashboard `+` starts a **create** interview (no form). Detect / organize / resume import still persist rows in the background.

Prefs / hard-stop use the **same card pattern**: File Diff of **proposed search brief vs current**, then Confirm upserts. That fixes the mid-level save that showed a preview (no `+`/`−`) and the senior turn that showed chips instead of a proposed-vs-current diff.

---

## 2. Non-goals

- jal-co Diff Viewer; brief or evidence File Diff in the side panel.
- A stored `.md` SoT for a project / experience / stack. Diff markdown is a **generated view** of columns.
- Scoring from File Diff or from interview prose.
- Model-callable `apply-*` / `updateProject` after Confirm.
- Multi-entity ApprovalCards or “confirm all.”
- Creating a stub row at interview start.
- Eager search-brief File Diff after an evidence save.
- Replacing detect / organize / resume import UIs with this interview.
- Moving inspect bodies into `packages/ui`.
- Editing applications / CRM rows through this interview (kind registry stays `project | experience | stack` for v1).
- Question-stepper / radios on the approval card.

---

## 3. Frozen decisions (grill log)

| #   | Topic                | Decision                                                                                                                                                                                                                        |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Write paths          | Inspect stays. **Forms go** for human create/edit. List `+` starts a create interview. Detect / organize / resume import still write rows.                                                                                      |
| 2   | Approval File Diff   | Diff the **target**. Prefs / hard-stop → `search-brief.md` (current vs **proposed after save**). One project / experience / stack → generated view of **that row**.                                                             |
| 3   | Inspect              | One **Evidence inspect shell** (header, scroll, prev/next, close). Kind-specific **body** (project Overview/Analysis/repo; experience role/dates/projects; stack icon/family/portfolio). File Diff is **not** the inspect view. |
| 4   | Interview            | Questions in **chat**. Card = File Diff + Confirm / Cancel only.                                                                                                                                                                |
| 5   | Enough               | Per-kind **goals in `@tsu-stack/core`**: field, required/optional, one sentence on why the pipeline cares. Card **blocked** until every required goal has a value. Optional: ask once, then proceed.                            |
| 6   | Start                | **No Edit, no form.** Interview starts when the user **asks in chat**. Agent uses list / get / **`searchEvidence`**.                                                                                                            |
| 7   | Confirm              | **Card writes** (`projects.create`/`update`, same for experience/stack). **No** apply tool. Cancel writes nothing.                                                                                                              |
| 8   | Search               | `searchEvidence({ kind, query })` → short ranked hits (`id`, title, one-liner). Then `get*`. Close hits → ask which. Never invent an id.                                                                                        |
| 9   | Multi                | **One entity per interview / card.** Agent says which it starts with. After **Confirm** → interview the next. After **Cancel** → ask if they want more edits on **this** one, then the next.                                    |
| 10  | Edit vs create       | Edit = **delta + missing required**. Create = all required (+ optionals once). Diff is always **full** current vs **full** proposed.                                                                                            |
| 11  | Create persist       | **No stub.** No `id` until Confirm `create`. Cancel drops the proposal.                                                                                                                                                         |
| 12  | Brief after evidence | **Invalidate only.** No stacked `search-brief.md` File Diff on that turn.                                                                                                                                                       |

---

## 4. Key decisions

1. **SoT stays columns.** Project / experience / stack rows and `job_preference` columns are SoT. Generated markdown is for File Diff and interview only. Search brief remains a projection (search-brief spec KD 1–4, 13). Evidence Confirm **invalidates** the brief; it does **not** `ensureBrief` on that turn.

2. **`open-entity-form` is not the human write path.** Remove Edit from inspect. Do not mount `ProjectForm` / `ExperienceForm` / `StackForm` from hub or from list `+`. Forms may remain as unused or import-only internals; they are not a product door. ADR 0025 still describes inspect chrome.

3. **New HITL: `propose-evidence-change`.** Client tool, no `execute`. Input: `kind`, `id` (omit on create), `patch` (column delta), `currentMarkdown`, `proposedMarkdown`. Output: `{ action: "confirm" \| "cancel", kind, id? }`. Confirm runs create/update then invalidates brief. Agent must not call this until required goals are satisfied (core helper `evidenceGoalsReady(kind, record)`).

4. **Hard-stop / prefs card** uses the same ApprovalCard + File Diff. Before Confirm, client (or tool args) supplies **current brief markdown** and **proposed brief markdown** (lists/prose as they would look after the patch). Confirm upserts; card may collapse to “approved.” Do **not** show preview-only File Diff (all context, no `+`/`−`) when `searchBriefChanged` is true. Cache-hit / first-build preview stays for “what am I looking for?” with no write.

5. **File Diff modes (bug lock).**
   - **Preview:** `previewFileLines` — no `+`/`−`. Identity / rules / “show my brief.”
   - **Edit:** `lineDiff(previous, next)` when there is a real previous snapshot and it differs, or when the card is proposing a write.  
     Long lines wrap. Viewport is tall enough (or scrollable) that added lines are visible. After get-search-brief on a **question** (“where is the intro?”), auto-resume **once** and **show** a 1–2 sentence answer; do not leave an empty turn.

6. **`searchEvidence`** lives on the agent (tenant from `requestContext`). Rank by simple title/org/name match. Cap ~8. Returns no descriptions longer than one line.

7. **Supervisor.** Casual “edit that project / add a job / change the RAYA experience” → search/get → interview (say why each required field matters) → `propose-evidence-change`. After that tool, **zero** user-facing text until the card returns. After Confirm, if another named entity remains, start its interview. After Cancel, ask about more edits on the current entity, then continue the queue. Never `listNewJobs` / triage on a prefs or evidence write turn.

---

## 5. Evidence goals (core)

Each goal: `id`, `column`, `required`, `pipelineRole` (one sentence; agent says this in chat, not as a form label).

### Project

| Goal                  | Required | Pipeline role                                                                |
| --------------------- | -------- | ---------------------------------------------------------------------------- |
| `title`               | yes      | Identity on the public profile, brief “who I am,” and match evidence titles. |
| `summary`             | yes      | Short signal for job-preference match and the brief skills/who paragraph.    |
| `year`                | yes      | Timeline order; “latest project” and inspect chronology.                     |
| `description`         | no       | Longer body for inspect / public page; not required to score.                |
| `repos` / `demoUrl`   | no       | Open-repo / demo; detect stacks can fill later.                              |
| `includedInPortfolio` | no       | Whether the public profile shows this row. Ask once.                         |

Create: collect required (and optionals once). Edit: only the delta + empty required.

**Project copy lock:** `summary` / `description` edits must be grounded in `project.analysis` (private notes). `getProject` returns analysis. Confirm is blocked if analysis is empty or the proposed copy does not share analysis facts. New user-stated facts go on `patch.analysis` as well. Do not put analysis in the File Diff. Title / year / links / portfolio flags do not need analysis.

### Experience

| Goal                   | Required | Pipeline role                                          |
| ---------------------- | -------- | ------------------------------------------------------ |
| `title`                | yes      | Role name for brief, match, and public timeline.       |
| `organization`         | yes      | Employer identity; “companies I worked at.”            |
| `description`          | yes      | What you did — brief who-paragraph and match evidence. |
| `fromDate`             | no       | Timeline; ask once.                                    |
| `toDate` / `isPresent` | no       | Timeline end; current role.                            |
| `includedInPortfolio`  | no       | Public timeline inclusion. Ask once.                   |

### Stack

| Goal                                 | Required | Pipeline role                                        |
| ------------------------------------ | -------- | ---------------------------------------------------- |
| `name`                               | yes      | Catalog key; brief skills list; match “tools I use.” |
| `type`                               | no       | Organize / family; detect often fills this.          |
| `description`                        | no       | Inspect copy.                                        |
| `isFeatured` / `includedInPortfolio` | no       | Public Skills row vs full catalog. Ask once.         |

Agent **must not** open `propose-evidence-change` while `evidenceGoalsReady` is false. Implementation: pure function in `@tsu-stack/core` + unit matrix.

---

## 6. Generated File Diff view

Not stored. Built from the record (current row or `{ ...current, ...patch }` / create draft).

Project (example):

```markdown
# Project: Dev-Hub

Year: 2026
Portfolio: yes

## Summary

…

## Description

…
```

Experience / stack: same idea (`# Experience: Senior Frontend @ Ment'ech`, dates, description).

Prefs proposal: run the same brief **formatter** on current structured prefs vs prefs-after-patch (lists-only if no BYO). Do not persist the proposed brief until Confirm + later lazy `ensureBrief`.

---

## 7. Approval card

beUI **ApprovalCard** in the hub thread (`shared/ui/agents/approval-card`).

- Title: “Confirm project change” / “Confirm new experience” / “Confirm preference change.”
- Body: File Diff (`file` = `project.md` / `experience.md` / `stack.md` / `search-brief.md`).
- Footer: **Confirm** / **Cancel** using existing `@tsu-stack/ui` Button. **No** hover flip; **yes** Confirm → loading state.
- No command/scope inputs, no chips as the only preview (chips optional under the diff).
- `data-hitl-kind="confirm"`.
- After Confirm: persist, then collapse / receipt. Do not auto-resume into triage or a second propose.

---

## 8. Tools (agent)

| Tool                                                 | Role                                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `searchEvidence`                                     | Ranked id hits by kind + query.                                                                                 |
| `listProjects` / `getProject` (and experience/stack) | Existing catalog / full row.                                                                                    |
| `propose-evidence-change`                            | HITL; client create/update.                                                                                     |
| `propose-hard-preference-change`                     | HITL; client upsert + File Diff of proposed brief.                                                              |
| `get-search-brief`                                   | Identity / rules preview or post-rebuild edit File Diff. After a **question**, resume once for a spoken answer. |
| `upsertSoftJobPreferences`                           | Unchanged (immediate).                                                                                          |

Remove hub **open-entity-form** from the human path (and inspect Edit). `open-entity-inspect` stays for “show my latest project.”

---

## 9. Inspect

`DeferredEntityInspectHost` (or successor) mounts one **EvidenceInspectShell**. Bodies stay the existing panels (or thin adapters). No Edit. Optional: no “Change in chat” button required — start is spoken. List `+` opens/focuses hub with a create intent (kind only).

---

## 10. Flows

```text
User: edit Dev-Hub and the RAYA job
Agent: Let's start with Dev-Hub.
       [searchEvidence / getProject]
       [delta questions]
       propose-evidence-change → File Diff
User: Confirm
       client projects.update + invalidate brief
Agent: Next, the RAYA experience.
       [interview → card]

User: Cancel on Dev-Hub
Agent: Want more edits on Dev-Hub before we do RAYA?
```

```text
User: change role to senior
Agent: propose-hard-preference-change
       File Diff search-brief.md (level senior vs current)
User: Confirm → upsert + invalidate
```

```text
User: where is the intro part?
Agent: get-search-brief (preview or last edit)
       then 1–2 sentences: intro was dropped in the last rewrite
```

---

## 11. Testing / hardening

- Core: `evidenceGoalsReady` matrix (create missing title; edit with title present; stack name only).
- `searchEvidence` ranking / cap / empty.
- File Diff: preview vs edit; wrap long lines; added lines reachable.
- Hard-stop card shows `+`/`−` when level/salary/exclude actually change; not a preview dump.
- Confirm persist: create has no row until Confirm; edit Cancel leaves row; inbox/triage not opened.
- Multi-entity queue: Confirm then second interview; Cancel then “more on this?”
- get-search-brief follow-up is not an empty 3s turn.
- Fresh [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) loop + `LESSONS.md` before claiming done. Natural language only.

---

## 12. Implementation notes (not product)

- Client mutations live in `features/agent-hub` (no import of `features/projects` internals if FSD forbids; use oRPC).
- Agent still must not import `@tsu-stack/api`.
- Generated view helper in `@tsu-stack/core` so API/web/agent tests share it.
- Register `searchEvidence` + `propose-evidence-change` in `apps/agent/src/mastra/index.ts`.
- Update search-brief spec KD 7 pointer and CONTEXT.md “entity form panel” / hub operator lines in the same change as the first implementing PR (or this spec PR).
