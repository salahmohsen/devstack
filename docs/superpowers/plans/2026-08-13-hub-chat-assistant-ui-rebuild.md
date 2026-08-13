# Hub chat Grok-class rebuild (assistant-ui) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rebuild dashboard hub chat on free assistant-ui (Thread + history load façade + Tool UI toolkit + day separators + infinite-scroll older), with Mastra Memory as sole store, observational memory on, shared HubChatProvider preserved.

**Architecture:** Keep existing oRPC `chatStream` + slim Memory body + `shouldAutoResumeHubChat`. Bridge shared `useChat` via `useAISDKRuntime` + `ThreadHistoryAdapter.withFormat` (load from paginated `listHubMessages`, append no-op). UI: assistant-ui Thread primitives, day-separator chrome, top infinite-scroll prepend. HITL: `defineToolkit` for `propose-application-from-jd` and `generate-apply-package`. Agent: enable observational memory; keep `lastMessages: 20`.

**Tech Stack:** AI SDK **v6** (`ai@^6`, `@ai-sdk/react@^2` catalog) → pin `@assistant-ui/react-ai-sdk@1.3.x` (not v7 docs path). `@assistant-ui/react`, registry Thread (style `base-maia`), elements day-separator, Mastra Memory/OM, oRPC, TanStack Start/Query, coss/Base UI, existing hub HITL cards.

**Spec:** `docs/superpowers/specs/2026-08-13-hub-chat-assistant-ui-rebuild-design.md`

---

## File map

| Area                   | Create / modify                                                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deps                   | `apps/web/package.json` (+ lockfile); optional `components.json` registry `@assistant-ui`                                                                                                                                                      |
| Assistant-ui kit       | Create under `apps/web/src/shared/ui/assistant-ui/` (or `src/components/assistant-ui/` if alias prefers): `thread.tsx`, markdown, reasoning, tool-fallback, tool-group, tooltip-icon-button, attachment stubs as needed, day-separator element |
| History adapter        | Create `apps/web/src/features/agent-hub/lib/hub-thread-history-adapter.ts`                                                                                                                                                                     |
| Day / pagination utils | Create `apps/web/src/features/agent-hub/lib/hub-message-day.ts`, `hub-load-older.ts` (+ tests)                                                                                                                                                 |
| Provider               | Modify `hub-chat-provider.tsx`, `use-hub-chat.ts`, `list-hub-messages.query.ts`, `index.ts`                                                                                                                                                    |
| Hub UI                 | Rewrite `agent-hub-chat.tsx`; slim/replace message-parts/row/composer/empty/error/typing as Thread absorbs them; keep `application-from-jd-card.tsx` + approval card content                                                                   |
| Toolkit                | Create `apps/web/src/features/agent-hub/ui/hub-tools-toolkit.tsx` (or lib)                                                                                                                                                                     |
| API                    | Modify `packages/api/src/routers/agent.router.ts` `listHubMessages` pagination                                                                                                                                                                 |
| Agent                  | Modify `apps/agent/src/mastra/agents/hub-supervisor.ts` Memory OM                                                                                                                                                                              |
| Logging                | Hydrate / load-older events per `.agents/logging.md` if durable logs required                                                                                                                                                                  |

---

### Task 1: Dependencies + assistant-ui registry (AI SDK v6 pins)

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/components.json` (add `@assistant-ui` registry)
- Lockfile via `vp` / pnpm

- [x] **Step 1: Confirm catalog versions**

```bash
# From monorepo root — expect ai ^6 and @ai-sdk/react ^2
rg -n '^\s+ai:|@ai-sdk/react' pnpm-workspace.yaml
```

Expected: `ai: ^6.0.208`, `@ai-sdk/react: ^2.0.212`.

- [x] **Step 2: Add free assistant-ui packages compatible with AI SDK v6**

Do **not** install latest-only AI SDK v7 stack without upgrading monorepo `ai`.

```bash
cd apps/web
# Pin react-ai-sdk to v6 line per assistant-ui docs (AI SDK v6 → @assistant-ui/react-ai-sdk@1.3.x)
pnpm add @assistant-ui/react @assistant-ui/react-ai-sdk@1.3.40 @assistant-ui/react-markdown
# If peer warnings force a nearby 1.3.x, stay on 1.3 line; do not jump to 1.4+ without ai@7
```

- [x] **Step 3: Register Base UI–aware assistant-ui registry**

In `apps/web/components.json` `registries`:

```json
"@assistant-ui": "https://r.assistant-ui.com/styles/{style}/{name}.json"
```

(`style` is already `base-maia` → Base UI flavor.)

- [x] **Step 4: Add Thread kit components**

```bash
cd apps/web
# Prefer project ui script if it wraps shadcn; else:
npx shadcn@latest add @assistant-ui/thread
```

If CLI paths land outside FSD, **move** generated files to:

- `apps/web/src/shared/ui/assistant-ui/thread.tsx` (and siblings)
- Fix imports to `@tsu-stack/ui` / `@/shared` aliases used by the app

- [x] **Step 5: Add day-separator element**

```bash
npx shadcn@latest add @assistant-ui/elements-day-separator
```

Place under `apps/web/src/shared/ui/assistant-ui/day-separator.tsx` (or elements folder). We will use **separator chrome only**, not the full simple-text list as the hub renderer.

- [x] **Step 6: Typecheck web package**

```bash
pnpm --filter @tsu-stack/web exec tsc --noEmit
# or monorepo: vp check (scoped if available)
```

Expected: no unresolved `@assistant-ui/*` imports.

- [x] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/components.json apps/web/src/shared/ui/assistant-ui pnpm-lock.yaml
git commit -m "chore(web): add free assistant-ui deps and Thread kit for hub chat"
```

---

### Task 2: Paginate `listHubMessages` (Mastra-backed)

**Files:**

- Modify: `packages/api/src/routers/agent.router.ts` (`listHubMessages`)
- Test: unit test near API or pure helper if extract query builder

- [x] **Step 1: Extend input/output schema**

```ts
// input
z.object({
  agentId: agentIdSchema.optional(),
  limit: z.number().int().min(1).max(80).optional().default(40),
  /** 0 = newest page (default). Higher = older pages. */
  page: z.number().int().min(0).optional().default(0)
});

// output
z.object({
  messages: z.array(z.unknown()),
  uiMessages: z.array(z.unknown()).nullable(),
  hasMore: z.boolean(),
  page: z.number().int().min(0)
});
```

- [x] **Step 2: Pass page to Mastra Memory upstream**

Current fetch uses `page: "0"` and `perPage`. Wire `input.page` into query string. Compute `hasMore` from upstream (`hasMore` / `total` / length === perPage). Prefer official upstream fields when present.

```ts
const qs = new URLSearchParams({
  agentId,
  resourceId: userId,
  page: String(input.page ?? 0),
  perPage: String(input.limit ?? 40)
});
```

- [x] **Step 3: Preserve timestamps for day separators**

If `uiMessages` lack `createdAt`, map from raw `messages` (Mastra rows often have `createdAt`) onto UIMessage `metadata` or a parallel array the client understands. Document the chosen field in code comment.

Example metadata shape (client will read):

```ts
// preferred if UIMessage allows
metadata: {
  createdAt: isoString;
}
```

- [x] **Step 4: Order guarantee**

Newest page (`page=0`) must return messages in **chronological display order** (oldest→newest within page) as today. Older pages (`page>0`) same within-page order; client prepends.

- [x] **Step 5: Log failures (existing pattern)**

Keep `agent_hub_list_messages_*` events; add `page` to log fields when errors occur.

- [x] **Step 6: Manual / unit verify**

```bash
# After API up: call listHubMessages page 0 and page 1 if thread long enough
vp check # or package typecheck
```

- [x] **Step 7: Commit**

```bash
git add packages/api/src/routers/agent.router.ts
git commit -m "feat(api): paginate listHubMessages for hub chat history"
```

---

### Task 3: History adapter + hydrate via load only

**Files:**

- Create: `apps/web/src/features/agent-hub/lib/hub-thread-history-adapter.ts`
- Create: `apps/web/src/features/agent-hub/lib/hub-ui-message-time.ts` (+ test)
- Modify: `apps/web/src/features/agent-hub/ui/hub-chat-provider.tsx`
- Modify: `apps/web/src/features/agent-hub/api/list-hub-messages.query.ts`
- Modify: `apps/web/src/features/agent-hub/api/use-hub-chat.ts` (exports if needed)
- Modify: `apps/web/src/features/agent-hub/index.ts`

- [x] **Step 1: Time helpers (test first)**

```ts
// hub-ui-message-time.ts
export function messageCreatedAt(message: { metadata?: unknown; createdAt?: unknown }): Date | null;
export function formatHubDayLabel(d: Date, now?: Date): string; // "Today" | "Yesterday" | weekday+date
export function formatHubTimeLabel(d: Date): string; // local HH:mm
```

Tests: stable day boundaries; missing date → null / fallback bucket.

- [x] **Step 2: History adapter (load façade)**

```ts
import type { ThreadHistoryAdapter } from "@assistant-ui/react";

export function createHubThreadHistoryAdapter(opts: {
  loadPage: (page: number) => Promise<{ uiMessages: UIMessage[]; hasMore: boolean }>;
}): ThreadHistoryAdapter {
  return {
    async load() {
      return { headId: null, messages: [] };
    },
    async append() {},
    withFormat: (fmt) => ({
      async load() {
        const { uiMessages } = await opts.loadPage(0);
        // Map UIMessage[] → format repository items.
        // Prefer fmt.decode when rows match encode shape; else build
        // parentId chain: sequential previous id, message = UIMessage.
        return { messages: mapUiMessagesToHistoryItems(uiMessages, fmt) };
      },
      async append() {
        /* no-op: Mastra owns writes */
      }
    })
  };
}
```

Implement `mapUiMessagesToHistoryItems` carefully against `@assistant-ui/react-ai-sdk@1.3` types — if `withFormat` decode is required for stored rows, convert Mastra UIMessages into the repository shape the 1.3 runtime accepts (inspect types / examples in node_modules).

- [x] **Step 3: Provider uses useAISDKRuntime**

```tsx
// hub-chat-provider.tsx sketch
const chat = useMemo(() => createHubChat(), []);
const helpers = useChat({ chat });
const history = useMemo(
  () =>
    createHubThreadHistoryAdapter({
      loadPage: async (page) => {
        const data = await orpcClient.agent.listHubMessages({
          agentId: HUB_AGENT_ID,
          limit: 40,
          page
        });
        return {
          uiMessages: (data.uiMessages ?? []) as UIMessage[],
          hasMore: data.hasMore
        };
      }
    }),
  []
);
const runtime = useAISDKRuntime(helpers, {
  joinStrategy: "concat-content",
  adapters: { history }
});
// Wrap children:
// <AssistantRuntimeProvider runtime={runtime} config={AuiConfig({ tools: Tools({ toolkit: hubToolkit }) })}>
```

- [x] **Step 4: Remove dual hydrate**

Delete the `useListHubMessagesQuery` + `setMessages` effect path as the **primary** hydrate. Keep `historyReady`:

- Prefer: set `historyReady` true after first history load settles (subscribe to runtime init / first load promise).
- If 1.3 runtime does not expose a load promise cleanly, call `loadPage(0)` once in provider, `setMessages` **only** when adapter path cannot inject (document as temporary), but **do not** both adapter load and setMessages on the same open.

Target: **single hydrate path**.

- [x] **Step 5: Expose pagination state for load-older**

Context additions:

```ts
hasMoreHistory: boolean;
isLoadingOlder: boolean;
loadOlderMessages: () => Promise<void>;
```

`loadOlderMessages`: fetch `page = nextPage`, prepend unique-by-id messages, update page cursor, preserve scroll (handled in UI task).

- [x] **Step 6: Tests**

- `messages-for-mastra-memory` unchanged behavior.
- New: day format tests; optional mapUiMessages unit test.

```bash
pnpm --filter @tsu-stack/web exec vitest run src/features/agent-hub
```

- [x] **Step 7: Commit**

```bash
git commit -m "feat(web): hub history adapter load façade and AISDK runtime bridge"
```

---

### Task 4: Hub Thread UI (P0 shell + day separators + load older)

**Files:**

- Rewrite: `apps/web/src/widgets/agent-hub/ui/agent-hub-chat.tsx`
- Create: `apps/web/src/widgets/agent-hub/ui/agent-hub-thread.tsx` (message list + separators + sentinel)
- Create: `apps/web/src/widgets/agent-hub/lib/use-load-older-on-scroll-top.ts`
- Modify/delete gradually: `agent-hub-prompt-composer.tsx`, `agent-hub-message-row.tsx`, `agent-hub-empty-state.tsx`, `agent-hub-error-card.tsx`, `agent-hub-typing-indicator.tsx` (replace with Thread primitives or thin wrappers)
- Keep: `application-from-jd-card.tsx`, approval content components

- [x] **Step 1: Thread shell**

Use `ThreadPrimitive.Root` / `Viewport` with **`turnAnchor="bottom"`**, `ViewportFooter` + composer (Grok-ish pill: send/cancel; **no** mic/attachments productization required).

Empty: welcome + static suggestions via `AuiConfig` / `Suggestions([...])` from existing `hub-suggestions.ts` if present.

- [x] **Step 2: Custom message list with day separators**

Do **not** use DaySeparator as sole renderer.

```tsx
// Pseudocode
const messages = useAuiState((s) => s.thread.messages);
// or unstable_useThreadMessageIds + Unstable_MessageById if using id API

// For each message in order:
//   if day(msg) !== day(prev) → render day rule chrome (from elements day-separator styles)
//   render UserMessage | AssistantMessage (primitives + MarkdownText + GroupedParts)
```

User/assistant: stock Thread message patterns (copy/reload/edit, BranchPicker `hideWhenSingleBranch`). **No user photo avatar.**

- [x] **Step 3: Infinite scroll top**

```ts
// use-load-older-on-scroll-top.ts
// IntersectionObserver on sentinel at top of Viewport
// when intersecting && hasMoreHistory && !isLoadingOlder → loadOlderMessages()
// after prepend: restore scrollTop so first visible message stays put
```

Loading indicator above first message; on error show retry chip (no toast required if inline).

- [x] **Step 4: Wire agent-hub-chat**

```tsx
export function AgentHubChat() {
  // must be under HubChatProvider + AssistantRuntimeProvider
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AgentHubThread />
    </div>
  );
}
```

Ensure provider wraps AssistantRuntimeProvider **above** Thread (layout provider).

- [x] **Step 5: Smoke checklist (manual)**

- Hard refresh shows prior turns
- Day labels when timestamps span days
- Scroll top loads older without jump-to-top loss
- Send streams; cancel works
- Copy / reload / edit work in-session

- [x] **Step 6: Commit**

```bash
git commit -m "feat(web): assistant-ui hub Thread with day separators and load-older"
```

---

### Task 5: Tool UI toolkit (HITL)

**Files:**

- Create: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx`
- Modify: provider config `AuiConfig({ tools: Tools({ toolkit }) })`
- Modify: `application-from-jd-card.tsx` (only if props need adapter to `addResult`)
- Modify: `agent-hub-tool-approval.tsx` → used inside toolkit render
- Deprecate as SoR: `agent-hub-message-parts.tsx` propose/approval branches (remove when toolkit covers)

**Tool name keys (verify stream parts):**

| Stream / Mastra id            | Toolkit key candidates                                    |
| ----------------------------- | --------------------------------------------------------- |
| `propose-application-from-jd` | also `proposeApplicationFromJd` if UI parts use camelCase |
| `generate-apply-package`      | also `generateApplyPackage`                               |

Register **both** name variants if needed (duplicate render entry or normalize).

- [x] **Step 1: Propose-from-JD human/client tool UI**

```tsx
// toolkit entry
"propose-application-from-jd": {
  type: "backend", // or human — match 1.3 toolkit API
  render: ({ args, result, status, addResult }) => (
    <ApplicationFromJdCard
      input={parseProposeInput(args)}
      disabled={Boolean(result)}
      onAction={(action) => {
        void addResult?.({ action /*, edits */ });
        // If addResult not wired in AI SDK path, call useHubChat().addToolOutput({
        //   tool: "propose-application-from-jd", toolCallId, output: { action }
        // })
      }}
    />
  )
}
```

Prefer toolkit-native result completion; if AI SDK v6 + aui 1.3 only expose `addToolOutput` on Chat, call **`addToolOutput` from hub context inside render** (documented integration, not dual systems).

- [x] **Step 2: generate-apply-package approval UI**

```tsx
"generate-apply-package": {
  type: "backend",
  render: ({ args, approval, respondToApproval, result, status }) => {
    // If approval API present (preferred):
    // respondToApproval({ approved: true|false })
    // Else fall back to addToolApprovalResponse({ id: compositeApprovalId, approved })
  }
}
```

Match existing composite approval id format (`runId::toolCallId`) from current `AgentHubToolApproval` / stream parts.

- [x] **Step 3: Keep `shouldAutoResumeHubChat`**

Do **not** replace with bare `lastAssistantMessageIsCompleteWithToolCalls`.

- [x] **Step 4: Shared surfaces**

Import JD dialog still uses `useHubChat` + same toolkit (runtime provider must wrap dialog). Confirm dashboard layout wraps all consumers.

- [x] **Step 5: Smoke**

- Paste JD → card → save/package/dismiss resumes once
- Package approval approve/deny
- No infinite rewrite loop after multi-step server tools

- [x] **Step 6: Commit**

```bash
git commit -m "feat(web): hub Tool UI toolkit for propose-JD and package approval"
```

---

### Task 6: P1 polish (same program)

**Files:** Thread/composer files from Task 4; optional small components under `shared/ui/assistant-ui/`

- [x] **Step 1: Suggestions** — wire empty-state prompts from `hub-suggestions.ts` via assistant-ui Suggestions config.

- [x] **Step 2: Scroll-to-bottom** — `ThreadPrimitive.ScrollToBottom` pill when not at bottom.

- [x] **Step 3: Message timing** — only if finish metadata available from stream; else skip (no fake stats).

- [x] **Step 4: Stopped-run / cancel** — ensure Cancel shows while `thread.isRunning`; partial message retained.

- [x] **Step 5: Draft restore** — only if Composer draft persistence is trivial (localStorage keyed by hub thread id); else skip and note in PR.

- [x] **Step 6: Feedback** — presentational thumbs only if no backend; or wire if existing feedback API exists (search codebase first). Skip backend invent.

- [x] **Step 7: Message queue** — enable only if `useAISDKRuntime`/composer queue is one-liner; else skip.

- [x] **Step 8: Commit**

```bash
git commit -m "feat(web): hub chat P1 polish (suggestions, scroll-bottom, cancel UX)"
```

---

### Task 7: Observational Memory on hub-supervisor

**Files:**

- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`

- [x] **Step 1: Enable OM; keep lastMessages 20**

```ts
memory: new Memory({
  options: {
    lastMessages: 20,
    observationalMemory: true
    // or { model: "google/gemini-2.5-flash", scope: "thread" } if true is insufficient on installed @mastra/memory
  }
});
```

- [x] **Step 2: Confirm storage**

OM requires supported store on Mastra instance (Postgres path already used). If agent fails at runtime without model key for default Observer model, set explicit model from existing env/model router used elsewhere in agent.

- [x] **Step 3: Smoke**

- Multi-turn chat still works
- Memory thread still hydrates
- No new dual-write

- [x] **Step 4: Commit**

```bash
git commit -m "feat(agent): enable observational memory on hub-supervisor"
```

---

### Task 8: Cleanup + acceptance

**Files:**

- Remove dead prompt-kit hub-only paths if unused
- Update design status to Accepted when shipped
- Logging: hydrate/load-older events if not added earlier

- [x] **Step 1: Delete or gut unused widgets**

If fully replaced: `agent-hub-message-parts` propose branches, old composer, old scroller — only after toolkit parity.

- [x] **Step 2: Acceptance matrix (manual)**

| Check                     | Pass                                      |
| ------------------------- | ----------------------------------------- |
| Reload history            | Prior user+assistant visible              |
| Day separators            | Labels correct with timestamps            |
| Load older                | Top sentinel; stable scroll; hasMore ends |
| Slim send                 | No rewrite thrash                         |
| Regenerate                | Session branch OK                         |
| Propose JD + package HITL | Cards + resume                            |
| Shared chat               | Hub + Import same thread                  |
| OM                        | Config on agent                           |
| No Cloud                  | No assistant-cloud dep                    |
| No photo avatars          | Stock bubbles only                        |

- [x] **Step 3: `vp check` / targeted tests**

```bash
pnpm --filter @tsu-stack/web exec vitest run src/features/agent-hub
pnpm --filter @tsu-stack/api exec tsc --noEmit  # or monorepo check
```

- [x] **Step 4: Final commit**

```bash
git commit -m "chore(web): remove obsolete hub chat chrome after assistant-ui migration"
```

---

## Risk notes for implementers

1. **AI SDK v6 vs assistant-ui docs v7** — APIs differ (`withFormat`, toolkit props). Read installed `node_modules/@assistant-ui/react-ai-sdk` types; do not copy v7-only samples blindly.
2. **History `withFormat` mapping** — hardest type step; time-box spike at start of Task 3; if load-via-adapter fails, fall back to single `setMessages` hydrate **without** dual path, still Mastra-backed.
3. **Tool part names** — stream may use `tool-propose-application-from-jd` type prefix; match existing `getToolName` logic.
4. **Scroll restore** — measure `scrollHeight` before/after prepend; set `scrollTop += delta`.
5. **No avatars / no Cloud / no multi-thread** — reject drive-by scope.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-08-13-hub-chat-assistant-ui-rebuild.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — this session, executing-plans with checkpoints

Which approach?
