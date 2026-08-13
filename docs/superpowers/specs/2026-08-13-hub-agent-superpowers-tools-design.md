# Hub agent superpowers tools — design

**Date:** 2026-08-13  
**Status:** Accepted  
**Plan:** `docs/superpowers/plans/2026-08-13-hub-agent-superpowers-tools.md`  
**Surfaces:** Dashboard hub chat (`/dashboard` home + floating chat on other dashboard routes)  
**Related:**

- [Hub agent tools + HITL](./2026-08-11-hub-agent-tools-hitl-design.md)
- [Hub chat assistant-ui rebuild](./2026-08-13-hub-chat-assistant-ui-rebuild-design.md)
- [Application apply package](./2026-08-04-application-apply-package-design.md)
- [New jobs + Tracked jobs](./2026-08-11-new-jobs-tracked-jobs-design.md)
- [Career Inbox + AI platform](./2026-07-29-career-inbox-ai-platform-design.md)

---

## 1. Goal

Make the hub supervisor feel **integrated with the product** — same objects and verbs as the dashboard — so one natural language turn can:

1. **Triage New jobs** (inbox, not yet tracked) against the seeker’s experience, projects, and stacks.
2. Let the user **confirm** Track / Dismiss on a structured card (uncheck rows).
3. For the **focus job**: optionally **offer apply package** (if JD is rich enough) and **first-apply send with attachments**; later mail is bare Inbox reply only.
4. **Mark related notifications** read; **navigate** to the job while keeping the agent in a **floating chat** off home.

**Implementation style (locked):** Approach 1 + **K2+** mini tools — thin wraps of existing domain/oRPC logic; agent decides tool order; no fat “super tools.”

**Non-negotiable:**

- Mastra Memory sole durable chat store (`dashboard-home:{userId}`).
- Tenant `userId` only from `requestContext` (never model-supplied).
- Free assistant-ui only (no Cloud).
- No generative layout (`present`); toolkit cards only.
- Attachments on **first apply send only**; stage **`applied`** is source of truth after that send.

---

## 2. Non-goals

- Full dashboard control plane (settings, domains, invites, GitHub admin, smart-rule CRUD as hub tools).
- Fat snapshot tools that hide multiple list/get calls behind one mega-tool.
- Auto-send mail or auto-dismiss without confirm.
- PDF/attachments on follow-up Career Inbox replies.
- Multi-thread sidebar / named chats / Assistant Cloud.
- Easy Apply / ATS form bots / calendar / generic web browse.
- Replacing existing apply-package or mail-reply product paths with a parallel implementation.

---

## 3. Decisions (grill log)

| #   | Topic                   | Decision                                                                                                                                                                               |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Program shape           | **One program**, four slices: New jobs triage, mail, notifications, navigate/floater. All in scope before “done.”                                                                      |
| 2   | Ship cut                | **A1:** one spec + one implementation plan; all four slices land before program complete.                                                                                              |
| 3   | Done test               | **D1:** one golden utterance exercises the full flow (with confirms as required).                                                                                                      |
| 4   | Agent loop              | **`maxSteps: 16`** (amends hub HITL `maxSteps: 4`). Align `HUB_CHAT_MAX_STEPS` + agent `defaultOptions`. Keep last-step `toolChoice: "none"` + system-reminder so turns end with text. |
| 5   | Tool shape              | **K2+:** mini tools only (wrap existing APIs/domain). Sharpen instructions; no redundant fat tools.                                                                                    |
| 6   | Architecture            | **Approach 1:** tools call same domain functions as oRPC; not agent→HTTP→oRPC.                                                                                                         |
| 7   | Triage writes           | **One client HITL card:** Track list + Dismiss list; user unchecks rows; Confirm applies thin write tools only for checked ids.                                                        |
| 8   | Matches                 | Related jobs appear under **Track** on the same card (not silent auto-track).                                                                                                          |
| 9   | Focus job               | Named in utterance, else **highest `matchScore`** among just-tracked. Only this job gets package/send offers in the turn (**Q1**).                                                     |
| 10  | Package gate (**G1**)   | Offer package only if title + company + description ≥ **~400 characters** after optional listing fetch for thin JD.                                                                    |
| 11  | First apply             | Domain path **generate → accept → send** (same as dashboard). Hub exposes all three as tools. Attachments only on **send**. Successful send sets stage → **`applied`**.                |
| 12  | Later mail              | Career Inbox: analyze/categorize → notification; agent may **reply without attachments**.                                                                                              |
| 13  | Applied source of truth | Pipeline stage **`applied`** (or further). Apply-send always categorizes as applied.                                                                                                   |
| 14  | Notifications           | Auto **mark read only for this turn’s** focus job / related mail (**N1**). Never mark-all.                                                                                             |
| 15  | Chat chrome             | **O4:** Assistant Modal floater on non-home dashboard routes; **removed** on `/dashboard` home.                                                                                        |
| 16  | Jump timing             | **F1:** Confirm triage on full home thread first; then navigate + floater.                                                                                                             |
| 17  | Sequence                | **S1:** Jobs card first; follow-ups (package/send/mail/notifs/jump) after confirm, based on what was kept.                                                                             |
| 18  | Send paths              | First-apply = package outreach **with** PDF. Follow-up Inbox = bare reply. No send if neither contact nor thread.                                                                      |

### Amendments to prior locks

| Prior lock                        | Change                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| Hub HITL `maxSteps: 4`            | Raised to **16** for multi-tool golden path.                                        |
| HITL “update-application post-v1” | **Allow** `updateStage` / track / dismiss as hub mini tools (dashboard-equivalent). |
| “Not full control plane”          | Still holds: no settings/domain/GitHub admin tools.                                 |
| Auto track/dismiss (early H1)     | **Superseded:** both go through the triage card.                                    |
| `markRead` auto                   | Only **related** notifications.                                                     |

---

## 4. Architecture

```text
Dashboard layout
  HubChatProvider (one Chat + useAISDKRuntime + toolkit)
    ├─ /dashboard (home)  → full AgentHubThread (no floater)
    └─ other /dashboard/* → AssistantModal floater (same runtime)
         │
         ▼
  oRPC agent.chatStream → hub-supervisor
         │
         ├─ mini tools → domain/repos (same as packages/api handlers)
         ├─ proposeNewJobsTriage (client HITL card)
         ├─ generateApplyPackage → acceptApplyPackage → sendApplyOutreach (each gated)
         ├─ generateMailReply / sendMailReply (send = confirm)
         └─ openSurface (frontend navigate)
         │
         ▼
  Mastra Memory thread: dashboard-home:{userId}
```

### Layer ownership

| Layer                             | Owns                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| **Mastra tools**                  | Thin execute wrappers; tenant from requestContext; structured errors |
| **Domain / packages/api helpers** | Real business rules (track, dismiss, package, mail send)             |
| **Web toolkit**                   | Card UIs, package approval UI, `openSurface` execute                 |
| **Dashboard layout**              | Single provider; home Thread vs off-home Modal                       |
| **Memory**                        | Durable messages; slim last-message client body unchanged            |

---

## 5. Tools

### Tenant rule

- `userId` **only** from `requestContext`.
- Never accept `userId` from model-controlled tool input.

### Existing hub tools (keep)

Evidence: `listExperiences`, `getExperience`, `listProjects`, `getProject`, `listStacks`, `getStack`, `listResumes`, `getResume`, `getJobPreferences`.  
CRM: `listOpenApplications` / `getApplication` (must support or be paired with **trackingStatus** `inbox` \| `tracked` \| `dismissed`).  
HITL: `propose-application-from-jd`, `create-application`, `generateApplyPackage` (requireToolApproval).  
Workflows: mail process/classify/harvest/reply, detect/organize stacks, resume import (as today).

### First-apply package → send (domain order)

Dashboard product path is **generate draft → accept package → send outreach**. Hub must not invent a shortcut that skips accept:

1. **`generateApplyPackage`** (`requireToolApproval`) → persists `applyPackageDraft` (same as API).
2. **`acceptApplyPackage`** (user confirm / approval) → materializes resume PDF, cover letter, outreach subject/body, `resumeId` (same as API).
3. **`sendApplyOutreach`** (`requireToolApproval`) → sends with PDF attachment; on success stamps send metadata and sets stage **`applied`**.

If the user declines at any step, stop that branch. Do not call send without a successful accept (domain requires `resumeId` + outreach body).

### New mini tools (domain wrap)

| Tool                     | Domain mapping                            | Auto after policy                                                                                      |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `listNewJobs`            | applications list `trackingStatus: inbox` | Yes                                                                                                    |
| `trackJob`               | promote inbox → tracked                   | After triage card                                                                                      |
| `dismissJob`             | soft dismiss                              | After triage card                                                                                      |
| `updateApplicationStage` | stage update                              | Yes for **non-applied** stages only (see stage rule below)                                             |
| `listMail` / `getMail`   | mail.list / mail.get                      | Yes                                                                                                    |
| `generateMailReply`      | mail.generateReply                        | Yes (draft only)                                                                                       |
| `sendMailReply`          | mail.sendReply                            | **`requireToolApproval` / confirm** — no attachments                                                   |
| `acceptApplyPackage`     | applications.acceptApplyPackage           | **Confirm** — materializes resume/cover/outreach from draft (required before send)                     |
| `sendApplyOutreach`      | applications.sendOutreach                 | **`requireToolApproval` / confirm** — with PDF; first apply; **only path that sets stage → `applied`** |
| `listNotifications`      | notifications.list                        | Yes                                                                                                    |
| `markNotificationRead`   | notifications.markRead                    | Yes (related only)                                                                                     |

**v1 out (YAGNI):** `restoreJob`, `addApplicationNote` — not required by the golden path; add later if needed.

### New client HITL tool

| Tool                   | Behavior                                                                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proposeNewJobsTriage` | Input: proposed track[] / dismiss[] with id, title, company, matchScore, reason. **No DB write.** UI: two lists, uncheck, Confirm/Cancel. Output: `{ trackIds, dismissIds }` (or cancel). Agent then calls `trackJob` / `dismissJob` only for returned ids. |

### New frontend tool

| Tool          | Behavior                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `openSurface` | Navigate via TanStack Router (`href` or route + entity id). After F1: only after triage confirm when the turn includes a jump. |

### Encoded rules (instructions + tool descriptions)

1. Triage: load New jobs + experiences/projects/stacks; build propose card; **never** write track/dismiss before confirm.
2. Focus job: named else max `matchScore` among just-tracked.
3. Package offer only if G1 quality after optional fetch.
4. First-apply order: **generate → accept → send**; attachments only on `sendApplyOutreach`.
5. Follow-up Inbox: `generateMailReply` + `sendMailReply` without PDF.
6. **Stage rule:** `updateApplicationStage` **must reject** target stage `applied` (and any terminal outcome). The **only** hub path that sets `applied` is successful `sendApplyOutreach` (domain already advances `saved → applied` on send).
7. Applied source of truth = stage `applied`+.
8. `markNotificationRead` only for notifs tied to this turn’s focus job / mail.
9. Get-by-id tools require real ids from list tools.

---

## 6. UI

### Home (`/dashboard`)

- Full hub thread only (day separators, tools, composer).
- **No** Assistant Modal floater.
- **New jobs triage card** (toolkit render for `proposeNewJobsTriage`): full width; Track + Dismiss sections; uncheck; Confirm / Cancel.
- Package / send: existing approval / confirm patterns.

### Off-home dashboard routes

- Official assistant-ui **Assistant Modal** (floating trigger + panel).
- Same `HubChatProvider` / runtime / thread.
- Mount **either** full Thread **or** modal Thread content — **not both**.

### Jump sequence (F1)

1. User confirms triage on home.
2. Thin writes run.
3. Follow-up offers (package/send) as applicable.
4. `openSurface` navigates.
5. Floater available on destination.
6. Return to `/dashboard` → floater unmounted.

### Invalidation

- Extend existing hub application sync: track, dismiss, stage, package, send → refresh New jobs / Tracked / Dismissed queries.
- Mail / notification queries: invalidate on related tool success where hooks already exist.

---

## 7. Golden path (acceptance)

**Setup:** ≥2 inbox jobs; portfolio evidence present; at least one G1-quality JD; optional Inbox mail linked to a job.

**Example utterance:**  
“Triage my new jobs against my experience, projects, and stacks. Track what fits, dismiss what doesn’t, then help me with the best match.”

**Must:**

1. Home shows Track/Dismiss card with reasons.
2. Confirm writes only checked rows.
3. Focus job = named or highest match among tracked.
4. G1 → package **generate** offer (approval); then **accept** confirm; then if first-apply + contact → **send-with-PDF** confirm → success sets **`applied`**.
5. Follow-up Inbox only → bare draft + send ask, no PDF.
6. Related notifs marked read; navigate; floater off-home.
7. Home again: no floater; history intact.
8. Final assistant text summary (not tool-only silence).

**Must not:** silent mass-dismiss; PDF on non-first-apply reply; floater on home; `applied` via `updateApplicationStage` or without successful apply-send; send without prior accept.

---

## 8. Errors

| Case                     | Behavior                                                |
| ------------------------ | ------------------------------------------------------- |
| Empty New jobs           | Short text; no card                                     |
| Empty evidence           | Card still allowed; reasons note missing portfolio data |
| Thin focus JD            | No package offer; one-line explanation                  |
| No contact / no Inbox    | No send ask                                             |
| BYO AI missing           | Existing AI-not-configured errors for package/draft     |
| Missing tool ids / `{}`  | Structured tool error; agent must list first            |
| Cancel triage card       | No track/dismiss writes                                 |
| Decline package/send     | Stop that branch; other steps may continue              |
| Send failure             | Do not set `applied`                                    |
| Navigate/floater failure | Thread remains usable                                   |

---

## 9. Testing (implementation phase)

- Unit: focus-job selection; G1 length gate; triage card output → track/dismiss ids; stage-on-apply-send.
- Unit: last-step processor still forces final text at step 15/16.
- Live UI: golden path on dashboard once (same bar as chat rebuild verification).

---

## 10. Implementation sketch (for writing-plans)

1. Raise `HUB_CHAT_MAX_STEPS` + hub-supervisor `maxSteps` to **16**; keep ensure-final-response processor.
2. Add mini tools (listNewJobs, track, dismiss, stage-with-applied-forbidden, mail, notifs, acceptApplyPackage, send paths) via domain functions.
3. Add `proposeNewJobsTriage` + toolkit card (C3/R3).
4. Wire `openSurface` frontend tool + instructions for F1; default navigate target for focus job: **`/dashboard/tracked-jobs`** (list; sheet/detail if available later).
5. Dashboard: Assistant Modal on non-home routes; hide on home.
6. Hub supervisor instructions: golden path sequence, generate→accept→send, first-apply vs Inbox reply, G1, N1, applied rule.
7. Invalidation extensions + golden-path live check.
8. Step budget: plan tool order so golden path fits under 16 steps (list/evidence, triage HITL, writes, generate, accept, send, notifs, navigate, final text).

---

## 11. Open points for planning (not product forks)

- Exact listing-fetch helper reuse for thin JD (existing harvest/fetch-job-page path).
- How application rows link to Career Inbox `messageId` for “mail about this job” (metadata / harvest provenance).
- Floater dimensions and whether package approval UI is usable inside the modal (prefer home for heavy cards when possible).
- Whether `listOpenApplications` is extended with `trackingStatus` or replaced by dedicated `listNewJobs` only.

These are implementation details; product behavior above is locked.
