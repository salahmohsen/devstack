# Hub chat Grok-class rebuild (assistant-ui, free) — design

**Date:** 2026-08-13  
**Status:** Accepted (grill-locked)  
**Plan:** `docs/superpowers/plans/2026-08-13-hub-chat-assistant-ui-rebuild.md`  
**Surfaces:** Dashboard hub chat (`/dashboard` home), shared `HubChatProvider` consumers (e.g. Tracked jobs import JD)  
**Related:**

- [Hub agent tools + HITL](./2026-08-11-hub-agent-tools-hitl-design.md)
- Career inbox / AI platform (hub supervisor)
- assistant-ui docs: AI SDK runtime, adapters, Tool UI, Elements
- Mastra docs: Memory, message history, observational memory, AI SDK UI

---

## 1. Goal

Rebuild the dashboard **agent hub chat** to **Grok-class** quality using **free (MIT) assistant-ui** only:

1. Fix **history hydrate** so past user/assistant turns from Mastra Memory show reliably after reload.
2. Modern Thread UX: streaming, markdown, reasoning/tool grouping, edit/reload/copy, empty/error/typing polish.
3. **Day separators** (“Tuesday, Aug 11”) over a long single thread.
4. **Tool UI toolkit** for existing hybrid HITL (propose-from-JD + package approval), not freeform generative layout.
5. Enable **Observational Memory** on hub-supervisor while keeping **`lastMessages: 20`**.
6. Paginated UI transcript with **infinite scroll at top** to load older messages.

**Non-negotiable:** no Assistant Cloud; no multi-thread sidebar; Mastra Memory remains the sole durable message store.

---

## 2. Non-goals

- Assistant Cloud / paid MAU backends.
- Multi-thread list, `cloneThread` product surface, or sidebar history of named chats.
- Durable branch trees across reloads (session-only branches OK).
- Generative UI `present` tool as the HITL spine (model invents layout).
- Session **user photo avatars** (stock Thread does not support; no workarounds).
- Attachments, voice/dictation, model picker productization, resumable mid-stream reconnect (P2+).
- Replacing Mastra hub-supervisor tools or oRPC `chatStream` protocol.

---

## 3. Decisions (locked in grilling)

| Topic | Decision |
| --- | --- |
| Free vs paid | **Free only** — `@assistant-ui/react`, `@assistant-ui/react-ai-sdk`, registry Thread/elements; **no** `assistant-cloud` |
| Adoption depth | Full free **architecture** (runtime + UI + history load façade + toolkit + P0/P1 polish) |
| Message truth | **Mastra Memory sole store**; history adapter **`load` only**; **`append` no-op** |
| Client stream body | **Last message only** (+ HITL assistant tail) + server Memory — existing slim path |
| Runtime hook | **`useAISDKRuntime`** on existing shared Hub `Chat` / `useChat` |
| Hydrate | History adapter `withFormat.load` → Mastra via `listHubMessages` (or equivalent) |
| UI transcript | **Paginated**; infinite scroll **at top** loads older pages |
| Viewport | **`turnAnchor="bottom"`** (Grok-like; compatible with top load-older) |
| Day separators | Custom list composition + official **`@assistant-ui/elements-day-separator`** chrome |
| Edit / reload / branch | Free UI on; **session** BranchPicker; durable history stays **linear** |
| Tool UI | **Tool UI toolkit** (`defineToolkit`); not `present` generative |
| HITL | Keep hybrid: client `addToolOutput` + server `requireToolApproval`; keep **`shouldAutoResumeHubChat`** |
| Ship cut | **P0 + P1** free elements (not entire Elements catalog) |
| Agent memory | **Observational Memory on** + **`lastMessages: 20`** unchanged |
| `joinStrategy` | **`concat-content`** (default) |
| User avatars | **Do not implement** photo avatars (stock components unsupported) |

---

## 4. Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Dashboard layout                                           │
│  HubChatProvider                                            │
│    createHubChat() → oRPC agent.chatStream (slim + trigger) │
│    useChat({ chat })                                        │
│    history adapter load → listHubMessages (page 0 latest)   │
│    useAISDKRuntime(chat, { joinStrategy, adapters.history })│
│    AssistantRuntimeProvider + AuiConfig({ tools: toolkit }) │
│         │                                                   │
│         ├─ AgentHub Thread (day list + Thread primitives)   │
│         └─ Tracked jobs / Import JD (useHubChat + tool UI)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    packages/api agent.chatStream
                              │
                              ▼
              apps/agent hub-supervisor + Memory
              (lastMessages: 20, observationalMemory)
              thread: dashboard-home:{userId}
```

### Layer ownership

| Layer | Owns |
| --- | --- |
| **Mastra Memory** | Durable messages, model context (`lastMessages` + OM), tool/approval persistence on stream |
| **oRPC** | Auth-scoped stream + list/paginate messages; convert Mastra → UIMessage |
| **AI SDK Chat** | In-browser messages, regenerate/edit, HITL resume |
| **assistant-ui runtime** | Thread state, BranchPicker (session), tool render resolution |
| **Web Thread UI** | Day separators, infinite-scroll older, P0/P1 chrome |

### Why not dual-write

Mastra docs: with Memory, send **only the new message**; full client history causes ordering bugs.  
assistant-ui history `append` that writes a second store would create two truths.  
**load façade only** matches both: Memory writes on stream; UI restores via recall/list.

---

## 5. Runtime integration

### 5.1 Packages (free)

- `@assistant-ui/react`
- `@assistant-ui/react-ai-sdk` (pin compatible with monorepo `ai` major)
- `@assistant-ui/react-markdown` (as required by Thread kit)
- Registry: Base UI–aware `@assistant-ui` style URL when project style is `base-*`
- Elements used in P0/P1 (copy-in): day-separator, and polish pieces listed in §8

### 5.2 Shared chat

Keep **one** `Chat` instance on dashboard layout (`HubChatProvider`):

- Transport: existing oRPC `eventIteratorToUnproxiedDataStream` + `messagesForMastraMemoryChat` / slim body + `trigger`.
- `sendAutomaticallyWhen: shouldAutoResumeHubChat` (do **not** switch to bare `lastAssistantMessageIsCompleteWithToolCalls` — multi-step server tools false-positive resume).
- Bridge: `useAISDKRuntime(helpers, { joinStrategy: "concat-content", adapters: { history } })`.
- Expose `useHubChat()` for non-Thread consumers (import JD, invalidation hooks).

### 5.3 History adapter

```text
withFormat(fmt):
  load:
    page 0 (latest window) from listHubMessages / Mastra recall → UIMessage repository
    preserve createdAt (or equivalent) for day labels
  append: no-op   // Mastra already persisted
  update: optional later for mid-HITL refresh; not required for v1 if stream+reload OK
```

Initial open: adapter load (or equivalent single hydrate path — **not** dual setMessages + adapter load).  
Older pages: app-level prepend via pagination API + `setMessages` (assistant-ui has no message-list `loadMore`; only thread-list does).

### 5.4 Pagination API

Extend `listHubMessages` (or sibling):

- Inputs: `limit` (e.g. 40), `page` or cursor (`before` / `after` createdAt or message id).
- Outputs: `uiMessages`, `hasMore`, optional `nextPage`.
- Upstream: Mastra Memory `listMessages` / `recall` with `page` + `perPage` + `hasMore`.
- Auth: always scope `resourceId` / thread from session (existing pattern).

Default first page: **latest 40** (current default), not full history.

---

## 6. UI composition

### 6.1 Thread shell

- Compose from assistant-ui **Thread primitives** + copied registry Thread styling, Grok-inspired composer polish (pill, send/cancel) without paid features.
- `turnAnchor="bottom"`.
- `scrollToBottomOnInitialize` after first page so open lands on latest.

### 6.2 Day separators

- Official element: `@assistant-ui/elements-day-separator` for **rule + day label + hover time** chrome.
- **Not** as sole message renderer (it only supports simple text bubbles).
- Pattern: map runtime messages → `{ id, day, time, role, … }` for separator insertion **or** insert separator rows between rich `MessageById` / custom list items when calendar day changes.
- Require hydrate conversion to preserve **timestamps** from Mastra.

### 6.3 Load older (infinite scroll top)

- Sentinel / IntersectionObserver near **top** of viewport.
- When `hasMore` and not loading: fetch previous page → **prepend** to chat messages → restore scroll position (anchor to first previously visible message id).
- Pause auto-follow while user is not at bottom (standard chat).
- Loading indicator at top; fail soft (toast/banner) without clearing the thread.

### 6.4 Message chrome (P0)

- Markdown text, reasoning group, tool group / ToolFallback.
- Action bars: copy, reload (regenerate), edit user → resubmit.
- BranchPicker with `hideWhenSingleBranch` (session only).
- Error state, typing/thinking indicators.

### 6.5 Message chrome (P1 — same program)

- Empty-state **suggestions** (static or lightweight config).
- Message timing (if stream metadata available; else skip gracefully).
- Scroll-to-bottom control.
- Draft restore if trivial with composer; else defer.
- Stopped-run / cancel affordance.
- Feedback UI optional wiring to existing feedback path if any; else presentational only without backend.
- Message queue UI only if runtime queue is enabled; else skip.

### 6.6 Explicitly out (avatars)

Stock Thread `UserMessage` and Elements speaker-identity **do not** support session photo avatars. **Do not** implement `user.image` avatars or parallel avatar systems.

---

## 7. Tools and HITL (Tool UI)

### 7.1 Toolkit registration

```text
defineToolkit({
  // names must match Mastra / stream tool names exactly
  proposeApplicationFromJd | propose-application-from-jd: {
    type: "human" | client result path,
    render: ApplicationFromJdCard → addResult / addToolOutput
  },
  generateApplyPackage | generate-apply-package: {
    type: "backend",
    render: approval → respondToApproval → addToolApprovalResponse
  },
  // other tools: ToolFallback or light status renders
})
```

Exact tool name keys must match what the stream emits (verify against hub-supervisor tool ids during implementation).

### 7.2 Keep

- Existing domain cards (`ApplicationFromJdCard`, approval UX).
- Shared toolCallId / approval id across Hub + Import dialog.
- `shouldAutoResumeHubChat` for client tool output + approvals only.

### 7.3 Replace

- Ad-hoc “scan all parts by name” as the **system of record** for tool UI registration.
- Prefer toolkit `render` so `part.toolUI` resolves inside Message `GroupedParts`.

### 7.4 Not in scope

- `JSONGenerativeUI` / `present` as primary UX.
- Changing Mastra `requireToolApproval` policy.

---

## 8. Elements / free polish inventory (this program)

| Priority | Include |
| --- | --- |
| **P0** | Thread kit, day-separator chrome, message actions, edit, branches (session), error, typing/thinking, tool-call/group/fallback, approval card chrome if useful, empty state shell, composer send/cancel |
| **P1** | suggestions, message-timing (if data), scroll-anchor, draft-restore (if free path), stopped-run, feedback UI, message-queue (if enabled) |
| **P2 / later** | attachments, voice, model picker product, connection/resumable streams, cost-meter, thread-list, generative demos |

---

## 9. Agent memory (hub-supervisor)

```ts
memory: new Memory({
  options: {
    lastMessages: 20,
    observationalMemory: true // or { model, scope: "thread" } per Mastra defaults
  }
})
```

- **Scope:** thread (single `dashboard-home:{userId}`).
- **Not:** resource-scope OM (experimental multi-thread mental model).
- Storage: existing Mastra/Postgres path (OM requires supported store — already in monorepo).
- UI depth ≠ model window: pagination loads many UI messages; model still sees lastMessages + OM compression.

---

## 10. Edit / regenerate / branching semantics

| Action | UI | Durable Memory |
| --- | --- | --- |
| Copy | Action bar | n/a |
| Reload | ActionBar Reload → AI SDK `regenerate` / `regenerate-message` slim body | New linear assistant content via stream; old branch siblings **not** guaranteed after full page reload |
| Edit user | Edit composer → resubmit | Linear rewrite; may need server `deleteMessages` for tail honesty if Mastra retains orphans — verify in implementation; prefer Mastra-native delete if required |
| BranchPicker | Session navigation among siblings | Lost on full reload after linear hydrate |

Document in UX: regenerating creates an alternate **in-session**; reload page shows Memory’s linear transcript.

---

## 11. Error handling and edge cases

| Case | Behavior |
| --- | --- |
| Empty / missing thread | Empty welcome + suggestions; no error |
| listHubMessages failure | historyReady true; empty or partial; non-blocking error presentation |
| Load-older failure | Keep current messages; show retry at top |
| Stream error | Message error primitive + existing parseAiError presentation |
| HITL mid-refresh | Best-effort: pending approval may require re-open; optional `update` later |
| Concurrent send while loading older | Prefer disable send only if required; default allow |

---

## 12. Logging

Follow [`.agents/logging.md`](../../../.agents/logging.md) for durable logs:

- Hydrate start/success/fail (counts, hasMore, not full message bodies).
- Load-older page fetch.
- Stream errors already on `agent.chatStream`.
- OM enable is config-only; no chatty per-observation logs unless Mastra emits useful server events already handled.

---

## 13. Testing / acceptance

| Check | Pass criteria |
| --- | --- |
| Reload | Prior user + assistant turns visible after hard refresh |
| Day separators | Correct labels when messages span calendar days (with timestamps) |
| Load older | Scroll top loads previous page; scroll position stable; hasMore ends cleanly |
| Send | Slim body only; no full-history thrash / rewrite loop |
| Regenerate | New answer streams; session BranchPicker if multiple |
| Propose JD | Card renders; addToolOutput resumes once |
| Package approval | Approve/deny works; no silent execute |
| Shared chat | Import JD and Hub see same thread instance |
| OM | Config present; agent still answers with Memory thread |
| No Cloud | No assistant-cloud dependency or env |

---

## 14. Migration / rollout

1. Add deps + registry Thread + history load façade (fix hydrate).
2. Swap hub widget to assistant-ui Thread composition (keep provider).
3. Toolkit HITL migration; remove redundant part scanner once parity.
4. Day separators + pagination API + infinite scroll top.
5. P1 polish elements.
6. Enable OM on hub-supervisor (`lastMessages: 20`).
7. Remove obsolete prompt-kit-only hub chat chrome when unused.

Feature flag optional; preferred path is main-line dashboard once smoke-tested.

---

## 15. File touch map (indicative)

| Area | Likely touch |
| --- | --- |
| Web provider | `apps/web/src/features/agent-hub/**` |
| Hub UI | `apps/web/src/widgets/agent-hub/**` |
| Dashboard layout | hub provider already on dashboard route |
| API | `packages/api` `listHubMessages` pagination |
| Agent | `apps/agent/.../hub-supervisor.ts` Memory options |
| UI kit | new `components/assistant-ui/*` or apps/web equivalent per monorepo conventions |
| Elements | day-separator + P1 copies under web |

Exact paths follow [TanStack / UI agents docs](../../../Agents.md) during planning.

---

## 16. Open implementation details (not product forks)

Resolved in plan, not re-grilled:

- Exact Mastra tool name strings for toolkit keys.
- Cursor vs page index for list API.
- Whether edit requires explicit Memory `deleteMessages` for tails.
- AI SDK / `@assistant-ui/react-ai-sdk` version pin against lockfile.
- Whether P1 feedback/queue ship only if existing backend hooks exist.

---

## 17. Success definition

A seeker opens Hub, sees **prior conversation with day bands**, scrolls up to load **older** turns, chats with **Grok-class** streaming and tools, reloads without losing history, and HITL proposal/package flows still work on the **same** Mastra thread — with **zero Cloud** and **no second message database**.
