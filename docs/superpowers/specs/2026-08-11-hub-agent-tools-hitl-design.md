# Hub agent tools + HITL apply-from-JD — design

**Date:** 2026-08-11  
**Status:** Accepted  
**Plan:** `docs/superpowers/plans/2026-08-11-hub-agent-tools-hitl.md`  
**Surfaces:** Agent Hub chat + Applications CRM  
**Related:** Career mail / apply package workflows, existing AI SDK v6 hub HITL

---

## 1. Goal

Harden the dashboard **hub supervisor** with tools that read (and carefully write) the seeker’s career graph — applications, experiences, projects, stacks, resumes, job preferences — and support a primary flow:

1. User pastes a **job description** (or URL) in **Hub** or **Applications → Import**.
2. Agent **recognizes** it as an application candidate (heuristic + intent).
3. UI shows a **structured card with buttons** (not free text only).
4. User chooses: **Continue with package** / **Save application only** / **Dismiss**.
5. On package path, **expensive** package generation (`generateApplyPackage` via thin hub tool) still requires an **Approve / Decline** gate.

No silent application create. Tenant isolation remains requestContext-only.

---

## 2. Non-goals (this program)

- Freeform generative HTML UI (LLM invents layout).
- Full dashboard control plane (domains, mail rules, GitHub admin, onboarding, etc.) in v1 tools.
- Migrating the chat kit wholesale to Vercel AI Elements (conflicts with coss/Base UI preference).
- Permanent `maxSteps: 1` as the “fix” for answer-rewriting (that was a workaround; multi-step is required — fix rewrite at root).

---

## 3. Decisions (locked)

| Topic                | Decision                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary surfaces     | **Both** Hub chat and Applications CRM                                                                                                             |
| Dual UI model        | **Shared tools + shared components**; same toolCallId / approval id                                                                                |
| Thread               | **Single hub thread** `dashboard-home:{userId}` for both doors                                                                                     |
| HITL shape           | **Hybrid:** client proposal tool (`addToolOutput`) + server **requireToolApproval** for package                                                    |
| HITL stack           | **AI SDK v6** (already: `useHubChat`, `addToolApprovalResponse`, auto-resume)                                                                      |
| UI kit               | **Keep prompt-kit** + coss/Base UI + packages/ui MessageScroller/Bubble; **selectively** port AI Elements patterns only when prompt-kit lacks them |
| Tools v1             | Career + evidence graph (not full dashboard mirror)                                                                                                |
| Agent loop           | **maxSteps = 4** + anti-rewrite instructions/UI (not maxSteps=1 forever)                                                                           |
| Package entry        | Thin hub tool `generate-apply-package` → existing `generateApplyPackage({ applicationId })` — never raw workflow I/O to the model                  |
| Shared chat state    | Single layout-level hub `Chat` provider; Applications consumes same instance                                                                       |
| Client-tool resume   | `addToolOutput` must auto-resume (mirror approval `sendAutomaticallyWhen`)                                                                         |
| JD detection         | Heuristic **or** explicit intent → always **proposal card**                                                                                        |
| Second approval gate | Expensive/irreversible only (apply package, bulk organize, send/outreach) — **not** create/update app after proposal                               |

---

## 4. Architecture

```text
Hub composer  ──┐
                ├──► thread: dashboard-home:{userId}
Applications    │         │
Import JD    ──┘         ▼
              AI SDK useHubChat
              → oRPC agent.chatStream
              → hub-supervisor
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
  read tools   propose* (client)  generate-apply-package
  (auto)       addToolOutput      (requireToolApproval)
     │              │              │
     └──────────────┴──────────────┘
                    ▼
         UIMessage parts → static GenUI
         (ApplicationFromJdCard, Tool, ToolApproval)
                    ▼
         existing DB / domain (tenant-scoped)
```

### Layers

| Layer            | Responsibility                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Agent**        | Expand hub-supervisor tools; thin `generate-apply-package`; multi-step (4) + anti-rewrite; BYO via requestContext |
| **API**          | Existing chatStream + approval **and** tool-output resume; no second chat protocol for Applications               |
| **Web shared**   | Layout-level hub `Chat` provider; tool-name → React component map for hub **and** Applications                    |
| **Applications** | Import entry sends into shared hub Chat; live view of pending proposal/approval parts                             |

---

## 5. Tools

### Tenant rule

- `userId` **only** from `requestContext` (set by chat/workflow handlers).
- Never accept `userId` (or equivalent) from model-controlled tool input.

### Read tools (auto-execute)

| Tool                                         | Purpose                                |
| -------------------------------------------- | -------------------------------------- |
| `list-open-applications` / `get-application` | Exist today — attach to hub-supervisor |
| `list-experiences` / `get-experience`        | Evidence graph                         |
| `list-projects` / `get-project`              | Evidence graph                         |
| `list-stacks` / search stacks                | Evidence graph                         |
| `list-resumes` / `get-resume` (metadata)     | Linking / package context              |
| `get-job-preferences`                        | Match context when proposing from JD   |

### Write / HITL tools

| Tool                                        | HITL                            | Behavior                                                                            |
| ------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `propose-application-from-jd`               | **Client tool**                 | Structured draft only; **no DB write** until UI `addToolOutput`                     |
| `create-application`                        | Auto after `save` \| `package`  | URL → `createIfAbsentByUrl`; no URL → plain create; always store full `description` |
| `update-application`                        | Post-v1 unless needed for link  | Stage, notes, resumeId — **not** in P0–P3                                           |
| `generate-apply-package`                    | **`requireToolApproval`**       | Input **`applicationId` only**; server calls existing `generateApplyPackage`        |
| Existing mail / organize / detect workflows | Keep / extend approval patterns | Bulk organize / send remain gated                                                   |

### Package path (locked)

- Hub tool **must not** accept full workflow input (portfolio snapshot, job blob, runtime LLM).
- Same domain path as Applications CRM: `generateApplyPackage({ applicationId, userId })` (userId from context).

---

## 6. JD flow (detail)

### Detection

Call `propose-application-from-jd` when:

- Message looks like a JD (length, role sections, apply/listing URLs, etc.), **or**
- User explicit intent (“apply”, “package”, “create application from this”, Applications Import submit).

Never create a CRM row without button confirmation.

### Proposal tool input (agent → UI)

| Field                  | Required | Notes                                                                                                     |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `title`                | yes      |                                                                                                           |
| `companyName`          | yes      |                                                                                                           |
| `description`          | yes      | **Full JD text** used for CRM `application.description` and package generation — not a short excerpt only |
| `url`                  | no       | Listing URL when known; used for `createIfAbsentByUrl` when present                                       |
| `applyUrl`             | no       |                                                                                                           |
| `location`             | no       |                                                                                                           |
| `matchScore` / `notes` | no       |                                                                                                           |

**Create mapping**

- Always persist `description` (full text) on create/update so package quality does not depend on chat history.
- **With URL:** `createIfAbsentByUrl` (idempotent).
- **Without URL:** plain `create` (no URL uniqueness); optional later: hash description for soft dedupe (out of v1).
- **URL-only user paste (no body):** hub may call existing job-page fetch/extract **before** proposing; if fetch fails, proposal still shows with empty description and asks user to paste body (no silent empty package).

### UI actions → `addToolOutput`

```ts
{
  action: "package" | "save" | "dismiss",
  edits?: { title?: string; companyName?: string; url?: string } // optional v1
}
```

| Button label          | action    | Follow-up                                           |
| --------------------- | --------- | --------------------------------------------------- |
| Continue with package | `package` | create application → start apply package (approval) |
| Save application only | `save`    | create application only                             |
| Dismiss               | `dismiss` | no create; short ack                                |

### After package

1. Create/find application (persist full `description`).
2. Call `generate-apply-package` with that `applicationId` → **approval-requested**.
3. User Approve/Decline via AI SDK approval + sticky `AgentHubToolApproval` (evolve Confirmation pattern only if needed).
4. On success: short final message + deep link to application / package UI.

---

## 7. Dual surface UX

### Hub

- Primary chat; all tools and cards in message stream.
- Sticky approval for package (and other approved workflows).
- Intermediate multi-step text collapsed where possible (extend existing stream text filters).

### Applications

- **Import from job description** (sheet or island): paste JD / URL → `sendMessage` into **same hub thread**.
- While `propose-application-from-jd` is `input-available`, render **the same** `ApplicationFromJdCard` bound to that tool part (second view, not second agent).
- Board/list continues to show real applications after create.

### Shared chat state model (locked)

Today `useHubChat` builds a local AI SDK `Chat` per mount (`id: "hub-home"`). Dual surface requires:

1. **Lift a single hub `Chat` (or React context provider)** to a layout level that both Hub home and Applications import can consume — same `Chat` instance, same `messages` / `addToolOutput` / `addToolApprovalResponse`.
2. **Hydration:** existing hub history load (`useListHubMessagesQuery` / Mastra memory) stays the source of truth on first mount; Applications must not create a second unhydrated `Chat`.
3. **Import UX:** Applications Import **does not** open a parallel agent. It either:
   - sends into the shared chat and shows the shared card inline in the sheet, **or**
   - navigates to Hub with prefilled send (acceptable fallback if provider wiring is incomplete in a PR).
4. **Do not** invent a second thread id for CRM import.

### Client-tool resume (locked)

- Approval path already uses `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses`.
- Proposal path must use the AI SDK equivalent so **`addToolOutput` resumes the run** (e.g. `lastAssistantMessageIsCompleteWithToolOutputs` or project-supported sibling). Spec implementers must wire this in the same `Chat` config; a card that never continues is a bug.

### Empty / discovery

- Hub empty state + Applications CTA: suggestion chips (“Paste a job description…”) using **prompt-kit** `PromptSuggestion`.

---

## 8. UI kit policy

| Use                       | Source                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Chat AI primitives        | **prompt-kit** (Tool, Markdown, Reasoning, PromptInput, PromptSuggestion, Loader, …)                   |
| Product chrome            | **coss / Base UI** + `packages/ui` (Button, Alert, Frame, Sheet, MessageScroller, Message, Bubble)     |
| Multi-choice JD card      | **Custom** `ApplicationFromJdCard`                                                                     |
| Binary package approval   | Evolve **AgentHubToolApproval**; optionally port AI Elements **Confirmation** _pattern_ only if needed |
| Full AI Elements registry | **No** wholesale migration                                                                             |

---

## 9. Agent loop & anti-rewrite

### Problem

`HUB_CHAT_MAX_STEPS = 1` was introduced to stop multi-step “bubble rewrite” (repeated capability lists / rephrased answers). That blocks real tool chains.

### Direction

1. Set hub **maxSteps to 4** (`HUB_CHAT_MAX_STEPS` + agent `defaultOptions` must match).
2. **Root fixes:**
   - Instructions: tool-only (or minimal) intermediate steps; **one** final user-facing answer; no capability re-lists after tools.
   - Prefer domain package generation (`generateApplyPackage`) for long multi-hop work, not open-ended agent loops.
   - UI: keep collapsing intermediate assistant text during multi-step streams.
3. HITL resume (approval **and** tool output) continues with tool results in context.

---

## 10. Security & tenancy

- All tools: tenant from session → `requestContext.userId`.
- No tool input field for `userId`.
- Mutations scoped by existing repositories (`*ForUser`, `createIfAbsentByUrl`).
- Do not stream sealed secrets or full resume binary into chat logs.
- Approval required for send/outreach and package generation.

---

## 11. Phasing (implementation order)

### P0 — Foundations

- Set **`HUB_CHAT_MAX_STEPS = 4`** + matching agent `defaultOptions`; anti-rewrite instructions + UI text collapse verification.
- Shared hub **`Chat` provider** at dashboard layout (single instance).
- Wire **`addToolOutput` auto-resume** alongside approval auto-resume.
- Register existing CRM read tools on hub-supervisor.
- Wire **`generate-apply-package`** (`applicationId` only) with `requireToolApproval` → `generateApplyPackage`.

### P1 — Evidence graph reads

- Experiences, projects, stacks, resumes, job prefs list/get tools.

### P2 — JD proposal HITL

- `propose-application-from-jd` client tool (full `description` required in input).
- `ApplicationFromJdCard` + `addToolOutput`.
- `create-application` after save/package (URL vs no-URL rules in §6).
- Hub message-parts registry entry.
- **`update-application` post-v1** (not P0–P3).

### P3 — Applications dual UI

- Import entry → shared hub Chat send.
- Shared card when proposal pending.
- Empty-state suggestions (prompt-kit).

### P4 — Polish

- URL-only import: job-page fetch before propose.
- Richer package progress (optional).
- Optional Confirmation-pattern upgrade for sticky approval (pattern only, not full Elements kit).
- Selectively fill prompt-kit gaps only.

---

## 12. Success criteria

- Paste JD in hub or Applications → proposal card with three actions.
- Save only → application on CRM board; no package run.
- Continue package → create app + approval gate → package workflow runs.
- Dismiss → no application row.
- Agent can answer questions using experiences/projects/stacks tools without leaving hub.
- No cross-tenant data in tool results.
- Multi-step runs do not spam rewritten full answers (regression-test the old rewrite failure).

---

## 13. Open implementation notes

- Exact Zod schemas live in `packages/core` when shared.
- **Package entry locked:** thin `generate-apply-package` → `generateApplyPackage({ applicationId })`.
- **maxSteps locked:** `4`.
- JD heuristic: start simple (length + keywords + URL); refine with evals later.
- Composer attachments (file JD) deferred unless trivial.

---

## 14. References

- AI SDK human-in-the-loop / tool approval UI: https://ai-sdk.dev/cookbook/next/human-in-the-loop
- AI SDK chatbot tool usage (client confirmation / `addToolOutput`): https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
- Static Generative UI (tool → fixed component): industry default for product agents
- Existing hub: `useHubChat`, `AgentHubToolApproval`, prompt-kit Tool/Reasoning, `HUB_CHAT_MAX_STEPS`
- Apply package: `generateApplyPackage` / Applications CRM package flows (workflow stays internal to that path)
