# Hub agent tools + HITL apply-from-JD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden hub-supervisor with career/evidence tools and a dual-surface (Hub + Applications) AI SDK HITL flow: propose application from JD → buttons → create app → optional package generation with approval.

**Architecture:** Single hub AI SDK `Chat` (layout provider) over `dashboard-home:{userId}`. Static GenUI: client tool `propose-application-from-jd` + `addToolOutput`; package via thin `generate-apply-package` tool → existing `generateApplyPackage({ applicationId })` with `requireToolApproval`. prompt-kit + coss stay; no full AI Elements migration. `HUB_CHAT_MAX_STEPS = 4` + anti-rewrite instructions/UI.

**Tech Stack:** Mastra hub-supervisor tools, packages/core Zod, packages/db repos, packages/api `generateApplyPackage`, AI SDK v6 (`useChat` / `addToolOutput` / `addToolApprovalResponse`), apps/web hub widgets + Applications pages, prompt-kit, coss/`@tsu-stack/ui`.

**Spec:** `docs/superpowers/specs/2026-08-11-hub-agent-tools-hitl-design.md`

---

## File map

| Area                 | Create / modify                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core contracts       | Create `packages/core/src/application/propose-from-jd.ts` (or under `agent/` if preferred); export from application/index + core index                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Hub maxSteps         | Modify `packages/api/src/lib/agent/hub-memory.ts`; `apps/agent/src/mastra/agents/hub-supervisor.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Tools                | Create under `apps/agent/src/mastra/tools/`: evidence list/get, `create-application`, `generate-apply-package`, `propose-application-from-jd` (client/no-op execute); register on hub-supervisor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Apply package bridge | Create tool that calls server-side domain (pattern: existing tools use `createDb`/`runWithDb`; for package, call shared `generateApplyPackage` from `@tsu-stack/api` **only if agent bundle already can import it** — otherwise thin oRPC/internal HTTP or extract pure domain to packages/api callable from agent; **prefer** same path as API router: if agent cannot import api, put execute in a small `packages/api` helper already used by router and import from agent carefully, or implement generate via existing `callApplyPackageAgent` mirror. **Decision for implementer:** inspect `list-open-applications` / mail tools; if agent only has db, create `packages/api` is wrong — use `callApplyPackageAgent` + persist like `generate-apply-package.ts` or duplicate minimal invoke. **Locked product path:** end state must equal Applications `generateApplyPackage`. |
| Shared Chat          | Create `apps/web/src/features/agent-hub/ui/hub-chat-provider.tsx` (or `api/hub-chat-context.tsx`); modify dashboard layout route + `useHubChat`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Tool output resume   | Modify `use-hub-chat.ts` `sendAutomaticallyWhen`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| JD card              | Create `apps/web/src/widgets/agent-hub/ui/application-from-jd-card.tsx`; modify `agent-hub-message-parts.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Applications import  | Create import sheet/section under applications page; use shared hub chat context                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Spec status          | Update design doc status to Accepted after P0 ships                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

### Task 1: maxSteps = 4 + anti-rewrite instructions

**Files:**

- Modify: `packages/api/src/lib/agent/hub-memory.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`
- Modify: `packages/api/src/routers/agent.router.ts` (if it hardcodes steps beyond constant)

- [ ] **Step 1:** Set `HUB_CHAT_MAX_STEPS = 4` and update comment: multi-step allowed; rewrite fixed by instructions + UI, not maxSteps=1.

- [ ] **Step 2:** Hub supervisor `defaultOptions.maxSteps: 4`.

- [ ] **Step 3:** Rewrite instructions section **Response discipline**:
  - Intermediate steps: prefer tools only; no full capability lists.
  - Exactly one user-facing final answer after tools complete for the turn.
  - JD paste → call `propose-application-from-jd` (do not invent CRM rows without that tool).
  - Package → only via `generate-apply-package` after user chose package and app exists.

- [ ] **Step 4:** `vp check` on touched agent/api files.

- [ ] **Step 5:** Commit

```bash
git add packages/api/src/lib/agent/hub-memory.ts apps/agent/src/mastra/agents/hub-supervisor.ts
git commit -m "fix(agent): allow hub multi-step with anti-rewrite discipline"
```

---

### Task 2: Shared hub Chat provider + tool-output resume

**Files:**

- Modify: `apps/web/src/features/agent-hub/api/use-hub-chat.ts`
- Create: `apps/web/src/features/agent-hub/ui/hub-chat-provider.tsx` (export context + provider)
- Modify: dashboard layout that wraps hub + applications (find `routes/(root-layout)/__protected/dashboard/route.tsx` or parent layout) — mount `HubChatProvider` once
- Modify: `apps/web/src/widgets/agent-hub/ui/agent-hub-chat.tsx` — consume context instead of calling `useHubChat()` factory per mount
- Export from `apps/web/src/features/agent-hub/index.ts`

- [ ] **Step 1:** Research AI SDK export for tool-output auto-send (e.g. `lastAssistantMessageIsCompleteWithToolCalls` / docs sibling of `lastAssistantMessageIsCompleteWithApprovalResponses`). Compose:

```ts
sendAutomaticallyWhen: async ({ messages }) => {
  // true if either approval responses complete OR client tool outputs complete
};
```

- [ ] **Step 2:** Refactor `useHubChat` so `Chat` instance is created **once** in provider (`useMemo` / module singleton keyed by user session). Context value: `{ ...useChat helpers, chat, addToolApprovalResponse, addToolOutput }`.

- [ ] **Step 3:** Wire provider into dashboard protected layout (must wrap Applications + Hub).

- [ ] **Step 4:** Manual smoke: open Hub, refresh, history still hydrates; approve flow still resumes.

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(web): shared hub Chat provider and tool-output resume"
```

---

### Task 3: Attach existing CRM tools + generate-apply-package tool

**Files:**

- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts` — `tools: { ... }`
- Create: `apps/agent/src/mastra/tools/generate-apply-package.tool.ts`
- Possibly: `apps/agent/src/mastra/tools/create-application.tool.ts` (can land in Task 6 if preferred; if package needs create first, create in Task 6)
- Register tools in agent index if required by codebase pattern
- Modify: `requireToolApproval` to match `generate-apply-package` / workflow names

- [ ] **Step 1:** Add existing `listOpenApplicationsTool`, `getApplicationTool` to hub-supervisor `tools`.

- [ ] **Step 2:** Implement `generate-apply-package` tool:

```ts
// inputSchema: z.object({ applicationId: z.string().min(1) })
// userId from requestContext only
// execute → generateApplyPackage({ applicationId, userId }) or equivalent
// output: { ok, applicationId, code?, message? }
```

If agent package cannot import `@tsu-stack/api` lib, extract a shared callable from the existing generate path into a package the agent already depends on, or call Mastra apply-package agent the same way `callApplyPackageAgent` does from a thin agent-local wrapper that still **persists draft** like the API. Do not accept portfolio/job LLM config from the model.

- [ ] **Step 3:** `requireToolApproval`: return true for `generate-apply-package` (and keep existing workflow regexes).

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(agent): hub CRM tools and generate-apply-package with approval"
```

---

### Task 4: Evidence graph read tools

**Files:**

- Create: `list-experiences.tool.ts`, `get-experience.tool.ts` (or combined list with optional id)
- Create: list/get projects, stacks, resumes (metadata), job preferences
- Pattern: copy `list-open-applications.tool.ts` (requestContext userId, createDb/runWithDb, repo methods)
- Register on hub-supervisor
- Update hub instructions with tool names

- [ ] **Step 1:** Implement list/get tools for experiences, projects, stacks, resumes, job preferences. Cap list limits (e.g. 20). Omit large HTML blobs if not needed (summary fields only).

- [ ] **Step 2:** Unit-style smoke: tools return `[]` when userId missing; no userId in inputSchema.

- [ ] **Step 3:** Commit

```bash
git commit -m "feat(agent): hub evidence graph read tools"
```

---

### Task 5: Core schema for propose-from-jd

**Files:**

- Create: `packages/core/src/application/propose-from-jd.ts` (or adjacent)
- Export from application package index + core index
- Optional small test for schema

- [ ] **Step 1:** Define:

```ts
export const ProposeApplicationFromJdInputSchema = z.object({
  title: z.string().min(1).max(300),
  companyName: z.string().min(1).max(200),
  description: z.string().min(1).max(50_000), // full JD
  url: z.string().url().optional().nullable(),
  applyUrl: z.string().url().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  matchScore: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});

export const ProposeApplicationFromJdOutputSchema = z.object({
  action: z.enum(["package", "save", "dismiss"]),
  edits: z
    .object({
      title: z.string().optional(),
      companyName: z.string().optional(),
      url: z.string().optional()
    })
    .optional()
});
```

- [ ] **Step 2:** Commit

```bash
git commit -m "feat(core): propose-application-from-jd schemas"
```

---

### Task 6: Client propose tool + create-application tool

**Files:**

- Create: `apps/agent/src/mastra/tools/propose-application-from-jd.tool.ts`
- Create: `apps/agent/src/mastra/tools/create-application.tool.ts`
- Modify: hub-supervisor tools + instructions (JD heuristic guidance)

- [ ] **Step 1:** `propose-application-from-jd`:
  - `inputSchema` = ProposeApplicationFromJdInputSchema
  - **No server execute** / or execute returns input unchanged (client-side tool). Confirm Mastra/AI SDK pattern used in project for client tools (may be tool without execute or execute deferred). Align with AI SDK “tools that require user interaction”.

- [ ] **Step 2:** `create-application` execute:
  - Inputs: title, companyName, description, url?, applyUrl?, location?, …
  - userId from context
  - If url present: `applicationRepository.createIfAbsentByUrl`
  - Else: `applicationRepository.create` (no url)
  - Always set `description` full text
  - Return `{ applicationId, created: boolean }`

- [ ] **Step 3:** Instructions: after proposal output `save`/`package`, call `create-application` then if package call `generate-apply-package`.

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(agent): propose-from-jd and create-application tools"
```

---

### Task 7: ApplicationFromJdCard + message parts wiring

**Files:**

- Create: `apps/web/src/widgets/agent-hub/ui/application-from-jd-card.tsx`
- Modify: `agent-hub-message-parts.tsx` — detect `tool-propose-application-from-jd` / dynamic name
- Modify: hub chat to pass `addToolOutput` into parts if needed
- Keep prompt-kit `Tool` for other tools; do **not** show generic Tool for proposal when card handles it

- [ ] **Step 1:** Build card with coss Button:
  - Display title, company, url, description clamp
  - Buttons: Continue with package / Save application only / Dismiss
  - On click: `addToolOutput({ tool: 'propose-application-from-jd', toolCallId, output: { action } })`
  - Disable after submit; show chosen action

- [ ] **Step 2:** In message parts, for `input-available` / `input-streaming` on propose tool → render card; for `output-available` → compact “You chose: …”

- [ ] **Step 3:** Sticky approval still handles `approval-requested` for generate-apply-package.

- [ ] **Step 4:** Manual: paste JD in hub → card → Save only → app on board.

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(web): ApplicationFromJdCard GenUI for hub HITL"
```

---

### Task 8: Applications Import dual UI

**Files:**

- Create or modify Applications page UI for Import JD (sheet/island)
- Consume `useHubChat` from shared provider
- Reuse `ApplicationFromJdCard` when pending propose part exists in messages
- Empty-state / CTA: prompt-kit `PromptSuggestion` “Paste a job description…”

- [ ] **Step 1:** Import UI: textarea + submit → `sendMessage({ text: jd })` on shared chat (optional prefix: “Import this job description:\n\n”).

- [ ] **Step 2:** If messages contain pending propose tool, render card in sheet (same handlers).

- [ ] **Step 3:** Fallback: if provider not ready, navigate to `/dashboard` with search/hash is acceptable temporary — prefer shared provider.

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(web): Applications import JD via shared hub chat"
```

---

### Task 9: Verification + docs

- [ ] **Step 1:** Manual checklist from spec §12 (all success criteria).

- [ ] **Step 2:** Confirm multi-step does not rewrite full capability lists (regression for maxSteps fix).

- [ ] **Step 3:** Update design doc status to **Accepted**; link this plan.

- [ ] **Step 4:** Commit

```bash
git commit -m "docs: mark hub tools HITL design accepted; plan verification notes"
```

---

## Out of scope (do not implement in this plan)

- Full AI Elements migration
- `update-application` general CRUD via agent
- Domains / mail rules / GitHub tools
- Soft-dedupe by description hash without URL
- Composer file attachments

---

## Testing notes

- Prefer manual + existing unit patterns for schemas/tools (agent tools often lack vitest harness — add small pure tests for schema + create mapping helpers if extracted).
- `vp check` on all touched packages after each task.
- Production rewrite regression: multi-step chat answer should not re-list “what I can do” after tools.

---

## Skill references

- Spec: `docs/superpowers/specs/2026-08-11-hub-agent-tools-hitl-design.md`
- AI SDK HITL: chatbot tool usage + human-in-the-loop cookbook
- Existing: `use-hub-chat.ts`, `AgentHubToolApproval`, `list-open-applications.tool.ts`, `generate-apply-package.ts`
