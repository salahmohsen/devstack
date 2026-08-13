# Hub agent superpowers tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship mini hub tools + New jobs triage HITL + first-apply generate→accept→send + related notifs + home/floater chrome so one golden utterance can triage New jobs against portfolio evidence and follow up on the focus job.

**Architecture:** Approach 1 + K2+: Mastra tools call the same domain/repos as oRPC (in-process; no agent→HTTP). Client HITL card `proposeNewJobsTriage` (same pattern as `propose-application-from-jd`). Package path reuses agent-local parity modules like existing `generate-apply-package`. Dashboard keeps one `HubChatProvider`; full Thread on `/dashboard` home only; official Assistant Modal floater on other dashboard routes. `maxSteps: 16` + last-step ensure-final-response.

**Tech Stack:** Mastra hub-supervisor, `@mastra/core` tools, packages/db repos, packages/core Zod, packages/api domain libs (parity in `apps/agent/src/mastra/lib/`), AI SDK + assistant-ui toolkit/HITL, TanStack Router, coss/`@tsu-stack/ui`.

**Spec:** `docs/superpowers/specs/2026-08-13-hub-agent-superpowers-tools-design.md`

---

## File map

| Area          | Create / modify                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| maxSteps      | `packages/api/src/lib/agent/hub-memory.ts` (`HUB_CHAT_MAX_STEPS = 16`); `apps/agent/src/mastra/agents/hub-supervisor.ts`; `apps/agent/src/mastra/processors/hub-processors.ts` (`HUB_SUPERVISOR_MAX_STEPS = 16`)                                                                                                                                                                                         |
| Core Zod      | Create `packages/core/src/agent/propose-new-jobs-triage.ts` (+ export from core index)                                                                                                                                                                                                                                                                                                                   |
| New job tools | Create `list-new-jobs.tool.ts`, `track-job.tool.ts`, `dismiss-job.tool.ts`, `update-application-stage.tool.ts` under `apps/agent/src/mastra/tools/`                                                                                                                                                                                                                                                      |
| Package path  | Create `accept-apply-package.tool.ts`, `send-apply-outreach.tool.ts`; agent-local `lib/accept-apply-package.ts`, `lib/send-apply-outreach.ts`, `lib/media-bucket.ts`, agent-local PDF helpers (or extract shared modules agent can import without `@tsu-stack/api`); add `pdfnative` + `files-sdk` (or current media deps) to `apps/agent/package.json`; wire `S3_*` (and Resend) into agent compose/env |
| Mail tools    | Create `list-mail.tool.ts`, `get-mail.tool.ts`, `generate-mail-reply.tool.ts`, `send-mail-reply.tool.ts`                                                                                                                                                                                                                                                                                                 |
| Notif tools   | Create `list-notifications.tool.ts`, `mark-notification-read.tool.ts`                                                                                                                                                                                                                                                                                                                                    |
| Client HITL   | Create `propose-new-jobs-triage.tool.ts` (no-op / client); web card + toolkit entry                                                                                                                                                                                                                                                                                                                      |
| Frontend tool | Create `open-surface` toolkit frontend tool + router navigate                                                                                                                                                                                                                                                                                                                                            |
| Floater       | Create `apps/web/src/shared/ui/assistant-ui/assistant-modal.tsx` (or features/agent-hub); mount from dashboard layout by route                                                                                                                                                                                                                                                                           |
| Sync          | Extend `use-invalidate-applications-on-hub-tools.ts` / hub applications sync for new tool names                                                                                                                                                                                                                                                                                                          |
| Spec status   | Update design doc Plan link + Status Accepted                                                                                                                                                                                                                                                                                                                                                            |

---

### Task 1: maxSteps 16 + ensure-final-response alignment

**Files:**

- Modify: `packages/api/src/lib/agent/hub-memory.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`
- Modify: `packages/api/src/routers/agent.router.ts` (only if it bypasses `HUB_CHAT_MAX_STEPS`)

- [ ] **Step 1:** Set `HUB_CHAT_MAX_STEPS = 16` and comment: superpowers golden path + last-step final answer; aligns with hub-supervisor.

- [ ] **Step 2:** Set `HUB_SUPERVISOR_MAX_STEPS = 16`; ensure `HubEnsureFinalResponseProcessor` uses that constant; `defaultOptions.maxSteps` uses same.

- [ ] **Step 3:** Confirm `agent.router` chatStream/generate pass `maxSteps: HUB_CHAT_MAX_STEPS`.

- [ ] **Step 4:** `vp check` in `packages/api` and `apps/agent` (or package-local typecheck for touched files).

- [ ] **Step 5:** Commit

```bash
git add packages/api/src/lib/agent/hub-memory.ts apps/agent/src/mastra/processors/hub-processors.ts apps/agent/src/mastra/agents/hub-supervisor.ts
git commit -m "feat(agent): raise hub maxSteps to 16 for superpowers path"
```

---

### Task 2: listNewJobs + trackJob + dismissJob mini tools

**Files:**

- Create: `apps/agent/src/mastra/tools/list-new-jobs.tool.ts`
- Create: `apps/agent/src/mastra/tools/track-job.tool.ts`
- Create: `apps/agent/src/mastra/tools/dismiss-job.tool.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts` (register tools)
- Test: colocate `*.tool.test.ts` only if package already tests tools; else pure helpers under `apps/agent/src/mastra/lib/` with unit tests preferred for focus-job later

- [ ] **Step 1:** Implement `listNewJobs` like `list-open-applications.tool.ts` but `applicationRepository.findByUserIdAndTrackingStatus(userId, "inbox")`. Output: id, companyName, title, stage, matchScore (from row/metadata), description length or snippet, recruiterEmail if present, sourceMessageId if present.

- [ ] **Step 2:** Implement `trackJob({ applicationId })` → `setTrackingStatus(id, userId, "tracked")` + activity kind promoted (mirror `applications.promote` router). Return `{ ok, applicationId }` or error code.

- [ ] **Step 3:** Implement `dismissJob({ applicationId })` → soft dismiss (mirror `applications.dismiss`). Return `{ ok, applicationId }`.

- [ ] **Step 4:** Register on hub-supervisor `tools`. Descriptions: use for New jobs inbox only; never invent ids.

- [ ] **Step 5:** Manual smoke or unit test with mocked repo if feasible; commit

```bash
git commit -m "feat(agent): listNewJobs trackJob dismissJob hub tools"
```

---

### Task 3: updateApplicationStage (forbid applied)

**Files:**

- Create: `apps/agent/src/mastra/tools/update-application-stage.tool.ts`
- Create: `apps/agent/src/mastra/lib/application-stage-guard.ts` (pure)
- Create: `apps/agent/src/mastra/lib/application-stage-guard.test.ts`

- [ ] **Step 1:** Write failing test:

```ts
import { describe, expect, it } from "vitest";
import { assertStageAllowedForHubTool } from "./application-stage-guard";

describe("assertStageAllowedForHubTool", () => {
  it("rejects applied", () => {
    expect(assertStageAllowedForHubTool("applied")).toEqual({
      ok: false,
      code: "APPLIED_VIA_SEND_ONLY"
    });
  });
  it("allows screening", () => {
    expect(assertStageAllowedForHubTool("screening")).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Implement guard: reject `applied` and terminal outcomes if passed as stage; allow open pipeline stages only (`saved | screening | interview | offer` per domain).

- [ ] **Step 4:** Tool calls guard then `applicationRepository.updateStage` (same as API).

- [ ] **Step 5:** Register tool; commit

```bash
git commit -m "feat(agent): hub updateApplicationStage without applied shortcut"
```

---

### Task 4: acceptApplyPackage + sendApplyOutreach (domain parity + media)

**Files:**

- Create: `apps/agent/src/mastra/lib/accept-apply-package.ts` (parity with `packages/api/src/lib/application/accept-apply-package.ts`)
- Create: `apps/agent/src/mastra/lib/send-apply-outreach.ts` (parity with API sendOutreach; must set stage applied on success)
- Create: `apps/agent/src/mastra/lib/media-bucket.ts` (or reuse existing agent media helper if present) — **S3/files put+get for resume/cover PDFs**
- Create: `apps/agent/src/mastra/tools/accept-apply-package.tool.ts`
- Create: `apps/agent/src/mastra/tools/send-apply-outreach.tool.ts`
- Modify: hub-supervisor `requireToolApproval` regex to include accept + send-apply-outreach / sendApplyOutreach
- Modify: `apps/agent` package env / Dockerfile if storage env vars are required for agent process

**Critical:** `generate-apply-package` only drafts JSON. **Accept writes PDFs; send reads PDF + Resend.** Agent **must not** import `@tsu-stack/api` (Mastra bundler). Do **not** assume S3 is already on agent compose — wire it.

API accept needs (today): `buildResumeDocument` (`packages/api/src/routers/resume-pdf.ts`), `buildCoverLetterPdfBytes` (`packages/api/src/lib/application/cover-letter-pdf.ts`), `pdfnative`, media put.  
API send needs: media get, `sendCareerReply` (or Resend), stage → applied.

- [ ] **Step 1:** Trace accept + send graphs. Choose **one** of:
  - **(A preferred):** Extract PDF builders + send helper into modules under `packages/` that **both** api and agent can import without pulling the full api router graph (e.g. `packages/api/src/lib/application/*` already — export from a thin subpath agent can depend on), **or**
  - **(B):** Copy-port minimal agent-local PDF/send modules under `apps/agent/src/mastra/lib/` (same Approach B as generate).

- [ ] **Step 2:** Add agent deps as needed: `pdfnative`, `files-sdk` (or project’s S3 client), ensure Resend path reuses agent `openSecret` / mail settings like other agent mail code.

- [ ] **Step 3:** Wire env: `S3_*` (or project media env names) + Resend into **agent** `.env` / docker-compose `agent` service. Document required keys in a short comment in `media-bucket.ts`.

- [ ] **Step 4:** Implement media client (`put` + `get`); fail closed `STORAGE_NOT_CONFIGURED`.

- [ ] **Step 5:** Implement `accept-apply-package.ts` + `send-apply-outreach.ts` using those helpers + db.

- [ ] **Step 6:** Tools: `{ applicationId }` only; tenant from requestContext; HITL approval; register; toolkit approval UI via existing `AgentHubToolApproval` / ToolFallback for accept+send names.

- [ ] **Step 7:** Commit

```bash
git commit -m "feat(agent): acceptApplyPackage and sendApplyOutreach hub tools"
```

---

### Task 5: Mail mini tools (list/get/draft/send bare)

**Files:**

- Create: `list-mail.tool.ts`, `get-mail.tool.ts`, `generate-mail-reply.tool.ts`, `send-mail-reply.tool.ts`
- Prefer agent-local parity (Resend + `openSecret` / user mail settings), **not** `@tsu-stack/api` import. Prefer mini tools over `mailReplyWorkflow` for bare follow-up replies.

- [ ] **Step 1:** `listMail` — category optional, limit; map list items (id, subject, from, category, createdAt). Exclude system notifs by default (match `mail.list`).

- [ ] **Step 2:** `getMail` — full detail by id; tenant-scoped.

- [ ] **Step 3:** `generateMailReply` — draft subject+body only; no send (reuse existing mail reply agent/helper if already in agent package).

- [ ] **Step 4:** `sendMailReply` — requireToolApproval; **no PDF attachment** (follow-up path); Resend via agent-local settings.

- [ ] **Step 5:** Register; commit

```bash
git commit -m "feat(agent): Career Inbox list get draft send hub tools"
```

---

### Task 6: Notification mini tools

**Files:**

- Create: `list-notifications.tool.ts`, `mark-notification-read.tool.ts`
- Use `appNotificationRepository` like `notifications.router.ts`

- [ ] **Step 1:** `listNotifications` — unreadOnly optional, limit; return id, kind, title, href, applicationId, messageId, readAt, createdAt.

- [ ] **Step 2:** `markNotificationRead({ notificationId })` — tenant-scoped.

- [ ] **Step 3:** Instructions (Task 9): only mark notifs related to focus job / that mail (N1).

- [ ] **Step 4:** Register; commit

```bash
git commit -m "feat(agent): list and mark-read notification hub tools"
```

---

### Task 7: proposeNewJobsTriage client tool + core schema + card UI + auto-resume

**Files:**

- Create: `packages/core/src/agent/propose-new-jobs-triage.ts` (Zod input/output)
- Export from packages/core
- Create: `apps/agent/src/mastra/tools/propose-new-jobs-triage.tool.ts` (same client-HITL pattern as `propose-application-from-jd.tool.ts`)
- Create: `apps/web/src/features/agent-hub/ui/new-jobs-triage-card.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx`
- Modify: `apps/web/src/features/agent-hub/lib/hub-tool-names.ts` — name matchers for triage tool
- Modify: `apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.ts` — add triage tool to **`HUB_CLIENT_RESUME_TOOL_NAMES`** (required or Confirm never re-POSTs)
- Modify: `lastHubHitlKind` — treat triage tool as **`"client"`** HITL so composer disables while card is open (same as propose-from-jd) — **required**
- Modify: invalidate hooks for track/dismiss tool names

- [ ] **Step 1:** Schema:

```ts
// track[] / dismiss[]: { id, title, companyName, matchScore?, reason }
// output: { action: "confirm" | "cancel", trackIds: string[], dismissIds: string[] }
```

- [ ] **Step 2:** Agent tool: description forces call **before** track/dismiss; mirror propose-from-jd execute/client-complete pattern exactly.

- [ ] **Step 3:** Card UI: two sections Track / Dismiss; checkboxes default on; Confirm → `addToolOutput` / `addResult` with filtered ids; Cancel → cancel action.

- [ ] **Step 4:** Toolkit `render` for tool name(s).

- [ ] **Step 5:** Wire **auto-resume**: `HUB_CLIENT_RESUME_TOOL_NAMES` includes `propose-new-jobs-triage` / `proposeNewJobsTriage` variants; unit test should-auto-resume if tests already cover JD tool.

- [ ] **Step 6:** Commit

```bash
git commit -m "feat(web,agent): New jobs triage HITL card and propose tool"
```

---

### Task 8: openSurface client tool (Mastra-visible) + navigate UI

**Problem:** Hub tools come from the **Mastra agent** over oRPC. A toolkit-only “frontend tool” is **invisible** to the model unless registered on the agent. Match **propose-from-jd**: Mastra tool + web complete via `addToolOutput` / toolkit.

**Files:**

- Create: `apps/agent/src/mastra/tools/open-surface.tool.ts` — registered on hub-supervisor; **no server side-effect** (or returns `{ ok: true, pendingClient: true }`); description: navigate dashboard after triage confirm
- Create: `apps/web/src/features/agent-hub/ui/open-surface-tool-ui.tsx` — on tool call, validate `href` under `/dashboard`, `navigate({ to: href })`, then `addResult` / `addToolOutput` so the loop continues
- Modify: toolkit + `hub-tool-names.ts` + **`HUB_CLIENT_RESUME_TOOL_NAMES`** (if openSurface pauses for client complete)
- Modify: hub-supervisor tools registration

- [ ] **Step 1:** Mastra tool schema `{ href: z.string().min(1) }` — description: only `/dashboard…` paths; default post-triage `/dashboard/tracked-jobs`.

- [ ] **Step 2:** Server execute: do not navigate; return structured “client must open” or empty success if architecture uses client-only completion (copy exact pattern from propose-from-jd).

- [ ] **Step 3:** Toolkit UI/effect: on pending openSurface part, navigate + complete tool output.

- [ ] **Step 4:** Reject non-dashboard hrefs on client; surface error result to model.

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(web,agent): openSurface client tool for hub navigate"
```

---

### Task 9: Hub supervisor instructions + tool registration + approval list

**Files:**

- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`

- [ ] **Step 1:** Register all new tools on `tools: { ... }`.

- [ ] **Step 2:** Expand `requireToolApproval` for: generate-apply-package, accept-apply-package, send-apply-outreach, send-mail-reply (and create-application as today).

- [ ] **Step 3:** Instructions block (concise):

  - New jobs triage: listNewJobs + evidence lists → proposeNewJobsTriage → only then track/dismiss.
  - Focus job: named else max matchScore among tracked this turn.
  - G1 package gate ~400 chars; generate → accept → send; applied only via send.
  - Follow-up Inbox: generateMailReply + sendMailReply no PDF.
  - markNotificationRead related only; openSurface after confirm when user wants show/jump.
  - maxSteps 16; one final answer.

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(agent): wire superpowers tools and hub instructions"
```

---

### Task 10: Dashboard floater (Assistant Modal) off-home only

**Files:**

- Create: `apps/web/src/features/agent-hub/ui/hub-assistant-modal.tsx` (AssistantModalPrimitive + Thread/AgentHubThread content)
- Modify: `apps/web/src/routes/(root-layout)/__protected/dashboard/route.tsx` — render modal when not index
- Or: dashboard shell layout component that uses `useRouterState` / matchRoute: if pathname is exactly `/dashboard` or `/dashboard/`, no modal; else modal

- [ ] **Step 1:** Implement modal using official AssistantModalPrimitive pattern; content reuses AgentHubThread **or** a slim Thread that still uses same provider (do **not** mount second HubChatProvider).

- [ ] **Step 2:** Home route: full `AgentHubChat` only; no modal.

- [ ] **Step 3:** Other dashboard child routes: page content + modal; no second full-page chat unless product already has one.

- [ ] **Step 4:** Verify one Thread instance: home unmounts modal; leaving home mounts modal.

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(web): hub Assistant Modal floater off dashboard home"
```

---

### Task 11: Query invalidation + golden-path checklist

**Files:**

- Modify: `apps/web/src/pages/dashboard/_lib/use-invalidate-applications-on-hub-tools.ts` (add track/dismiss/stage/accept/send tool name matchers)
- Mail/notif invalidation if similar hooks exist; else document follow-up

- [ ] **Step 1:** On tool completion for track/dismiss/stage/package/send → invalidate applications list/count queries. Extend `isSuccessfulMutatingToolOutput` (or equivalent) to treat `{ ok: true }` as success — name-only matching is not enough.

- [ ] **Step 2:** Manual golden-path checklist (live):

  1. Home: triage utterance → card
  2. Confirm → DB track/dismiss
  3. Package offer if G1; accept; send → stage applied
  4. Related notifs; openSurface; floater on tracked-jobs
  5. Back home → no floater

- [ ] **Step 3:** Update design doc Status + Plan link to this file.

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(web): invalidate CRM on superpowers tools; link plan"
```

---

## Step budget (golden path under 16)

Rough order for implementers / instructions:

1–4 listNewJobs + listExperiences + listProjects + listStacks  
5 proposeNewJobsTriage (HITL pause)  
6–N trackJob / dismissJob (batch in loop; each counts)  
N+1 getApplication / quality check  
N+2 generateApplyPackage (HITL)  
N+3 acceptApplyPackage (HITL)  
N+4 sendApplyOutreach (HITL)  
N+5 listNotifications + markNotificationRead  
N+6 openSurface  
Final: text summary (last step toolChoice none)

If too many dismiss/track ids, prefer one tool call per id but keep N small in card proposals (e.g. cap proposed rows at 10).

---

## Out of plan (spec open points)

- Exact thin-JD fetch helper wiring (reuse fetch-job-page when implementing G1).
- Perfect job↔mail join if `sourceMessageId` missing (best-effort search by company).
- Floater polish beyond official modal.

---

## Execution handoff

After plan review approval:

**1. Subagent-Driven (recommended)** — superpowers:subagent-driven-development  
**2. Inline Execution** — superpowers:executing-plans

Pick one when implementing.
