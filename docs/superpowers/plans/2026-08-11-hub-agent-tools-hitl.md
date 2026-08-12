# Hub agent tools + HITL apply-from-JD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden hub-supervisor with career/evidence tools and a dual-surface (Hub + Applications) AI SDK HITL flow: propose application from JD → buttons → create app → optional package generation with approval.

**Architecture:** Single hub AI SDK `Chat` (layout provider) over `dashboard-home:{userId}`. Static GenUI: client tool `propose-application-from-jd` + `addToolOutput`; package via thin `generate-apply-package` tool → existing `generateApplyPackage({ applicationId })` with `requireToolApproval`. prompt-kit + coss stay; no full AI Elements migration. `HUB_CHAT_MAX_STEPS = 4` + anti-rewrite instructions/UI.

**Tech Stack:** Mastra hub-supervisor tools, packages/core Zod, packages/db repos, packages/api `generateApplyPackage`, AI SDK v6 (`useChat` / `addToolOutput` / `addToolApprovalResponse`), apps/web hub widgets + Applications pages, prompt-kit, coss/`@tsu-stack/ui`.

**Spec:** `docs/superpowers/specs/2026-08-11-hub-agent-tools-hitl-design.md`

---

## File map

| Area                 | Create / modify                                                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core contracts       | Create `packages/core/src/application/propose-from-jd.ts` (or under `agent/` if preferred); export from application/index + core index                                                                                                              |
| Hub maxSteps         | Modify `packages/api/src/lib/agent/hub-memory.ts`; `apps/agent/src/mastra/agents/hub-supervisor.ts`                                                                                                                                                 |
| Tools                | Create under `apps/agent/src/mastra/tools/`: evidence list/get, `create-application`, `generate-apply-package`, `propose-application-from-jd` (client/no-op execute); register on hub-supervisor                                                    |
| Apply package bridge | **Locked:** agent tool must end in same semantics as API `generateApplyPackage({ applicationId, userId })`. Prefer export + agent dep on `@tsu-stack/api` subpath (A); fallback agent parity wrapper (B) with same error codes. No second pipeline. |
| Shared Chat          | Dashboard layout route + `HubChatProvider` owns Chat **and** history hydration once; `useHubChat` is context consumer only                                                                                                                          |
| Tool output resume   | `use-hub-chat.ts` `sendAutomaticallyWhen` = approval **or** tool-output complete                                                                                                                                                                    |
| JD card              | `application-from-jd-card.tsx` + message-parts                                                                                                                                                                                                      |
| Applications import  | Import sheet + shared card + **invalidate applications list** on create success                                                                                                                                                                     |
| Spec status          | Already Accepted; keep plan link                                                                                                                                                                                                                    |

---

### Task 1: maxSteps = 4 + anti-rewrite instructions

**Files:**

- Modify: `packages/api/src/lib/agent/hub-memory.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`
- Modify: `packages/api/src/routers/agent.router.ts` (if it hardcodes steps beyond constant)

- [x] **Step 1:** Set `HUB_CHAT_MAX_STEPS = 4` and update comment: multi-step allowed; rewrite fixed by instructions + UI, not maxSteps=1.

- [x] **Step 2:** Hub supervisor `defaultOptions.maxSteps: 4`.

- [x] **Step 3:** Rewrite instructions section **Response discipline**:
  - Intermediate steps: prefer tools only; no full capability lists.
  - Exactly one user-facing final answer after tools complete for the turn.
  - JD paste → call `propose-application-from-jd` (do not invent CRM rows without that tool).
  - Package → only via `generate-apply-package` after user chose package and app exists.

- [x] **Step 4:** `vp check` on touched agent/api files.

- [x] **Step 5:** Commit

```bash
git add packages/api/src/lib/agent/hub-memory.ts apps/agent/src/mastra/agents/hub-supervisor.ts
git commit -m "fix(agent): allow hub multi-step with anti-rewrite discipline"
```

---

### Task 2: Shared hub Chat provider + hydration + tool-output resume

**Files:**

- Modify: `apps/web/src/features/agent-hub/api/use-hub-chat.ts`
- Create: `apps/web/src/features/agent-hub/ui/hub-chat-provider.tsx`
- Create if missing: `apps/web/src/routes/(root-layout)/__protected/dashboard/route.tsx` — `<HubChatProvider><Outlet /></HubChatProvider>` (**not** on `__protected/route.tsx` — playground)
- Modify: `apps/web/src/widgets/agent-hub/ui/agent-hub-chat.tsx` — consume context; **move** `useListHubMessagesQuery` + `setMessages` hydration into the provider
- Export from `apps/web/src/features/agent-hub/index.ts`

- [ ] **Step 1:** Research AI SDK tool-output auto-send predicate; compose with approval:

```ts
sendAutomaticallyWhen: async (opts) => {
  // true if approval responses complete OR client tool outputs complete
};
```

- [ ] **Step 2:** Provider owns single `Chat`, `useChat`, **history hydrate once** (`historyReady`). Context: helpers + `addToolApprovalResponse` + `addToolOutput` + `historyReady`.

- [ ] **Step 3:** Mount on **dashboard** layout only.

- [ ] **Step 4:** Smoke: open Hub first (hydrate); open Applications first (Import still sees messages); approval + tool-output resume both work.

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(web): shared hub Chat provider, hydrate once, tool-output resume"
```

---

### Task 3: Shared generateApplyPackage + hub tool + CRM reads

**Files:**

- Modify: `packages/api/src/lib/application/generate-apply-package.ts` — ensure single exported `generateApplyPackage({ applicationId, userId })`
- Extract if needed: move shared generate into a module importable by agent **without** circular deps (preferred: add agent dependency on the package that owns the function after a thin split, **or** put a `generateApplyPackageForUser` in a path agent can import). **Concrete default:** implement `apps/agent/src/mastra/tools/generate-apply-package.tool.ts` that imports from `@tsu-stack/api/...` only after adding the dependency **or** duplicates by calling the **same** extracted function from e.g. `packages/api` → re-home extract under `packages/core` is wrong for DB side-effects; **best:** extract to `packages/api/src/lib/application/generate-apply-package.ts` and add `@tsu-stack/api` as agent dependency **if** tree allows, else copy-call via agent-local file that **imports the same source file** through workspace protocol after export from api package.json.
- Create: `apps/agent/src/mastra/tools/generate-apply-package.tool.ts`
- Modify: `hub-supervisor.ts` tools + `requireToolApproval`

- [ ] **Step 1:** Verify agent `package.json` deps. Choose **one**:
  - **(A preferred)** Export `generateApplyPackage` from `@tsu-stack/api` public subpath and add dependency in `apps/agent`; tool execute calls it with `userId` from requestContext.
  - **(B fallback)** Agent-local execute that is a line-by-line parity wrapper of the API function (same error codes). Document parity checklist in tool file comment.

- [ ] **Step 2:** Tool input: `{ applicationId: string }` only. Output: `{ ok, code?, message?, applicationId }`.

- [ ] **Step 3:** Attach `listOpenApplicationsTool`, `getApplicationTool` to hub-supervisor.

- [ ] **Step 4:** `requireToolApproval` true for `generate-apply-package`.

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(agent): hub CRM reads and generate-apply-package approval tool"
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
  - Inputs: title, companyName, **description** (full), url?, applyUrl?, location?, …
  - Apply optional proposal `edits` before write (title/company/url)
  - userId from context
  - If url present: `createIfAbsentByUrl` (**v1:** conflict returns existing row **without** overwriting description)
  - Else: `create` without url
  - Always pass full `description` on create
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

### Task 8: Applications Import dual UI + board invalidation

**Files:**

- Create or modify Applications page UI for Import JD (sheet/island)
- Consume hub chat context from shared provider
- Reuse `ApplicationFromJdCard` when pending propose part exists
- Empty-state / CTA: prompt-kit `PromptSuggestion`
- Invalidate applications list on successful create (see Step 3)

- [ ] **Step 1:** Import UI: textarea + submit → `sendMessage({ text: jd })` on shared chat (optional prefix: “Import this job description:\n\n”).

- [ ] **Step 2:** If messages contain pending propose tool, render card in sheet (same `addToolOutput` handlers).

- [ ] **Step 3:** When assistant tool part `create-application` (or generate path) reaches `output-available` with ok/created, **invalidate** applications TanStack Query (`useListApplicationsQuery` key / `orpcQueryClient.applications.list`) so the CRM board updates without full page reload. Same invalidation if watching hub stream on Applications page.

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(web): Applications import JD via shared hub chat"
```

---

### Task 9: Verification + docs

- [ ] **Step 1:** Manual checklist from spec §12 (all success criteria), including **board shows app after Save without hard refresh**.

- [ ] **Step 2:** Confirm multi-step does not rewrite full capability lists (existing `collapse-consecutive-text-parts` / filter helpers).

- [ ] **Step 3:** Confirm design doc remains **Accepted** and links this plan (already set; fix link only if drift).

- [ ] **Step 4:** Commit only if docs/notes changed.

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
