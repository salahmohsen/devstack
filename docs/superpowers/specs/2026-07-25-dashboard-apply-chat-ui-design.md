# Dashboard Home → Mastra Hub Chat (Supervisor)

**Status:** Pending user approval.

## Goal

Replace the current dashboard home page (a static resume overview) with a production-quality AI chat interface backed by a **Mastra supervisor agent** that has access to every tool, workflow, and sub-agent registered in `apps/agent/`. The dashboard home becomes a general "talk to your hub" surface — the user can ask for the weather, categorize stacks, run the detect-stacks workflow, ask about their resumes, or trigger the future apply-to-jobs flow. The supervisor decides which primitive to call based on the user's intent.

## Background & Constraints

- `apps/agent/src/mastra/index.ts` already registers `chatRoute({ path: "/chat/:agentId" })` from `@mastra/ai-sdk` v1.6.1, plus all the existing agents and workflows. Any new agent registered in the Mastra instance is automatically reachable at `/chat/<agentId>` with no additional server code.
- The existing agents are `weatherAgent` (id `weather-agent`, has `weatherTool`) and `stackCategorizerAgent` (id `stack-categorizer`, no tools). The existing workflows are `weatherWorkflow`, `detectStacksWorkflow`, `organizeStacksWorkflow`. None are currently wired to a chat-facing agent.
- The oRPC `agentRouter` already exposes `agent.chat` (non-streaming) and `agent.chatStream` (streaming) as **public** procedures. The streaming route proxies `/chat/:agentId` from the agent worker and converts the response to an oRPC event iterator that `useChat` consumes (see `packages/api/src/routers/agent.router.ts:209-239`).
- The dashboard home currently renders a resume overview (`pages/dashboard/home/dashboard-home-page.tsx`) with cards for experiences, projects, and stacks. The replace is full — the file is rewritten, not extended.
- `packages/ui` is coss-based (`base-maia` style, `stone` base color, Lucide icons). shadcn CLI registries are configured (`apps/web/components.json` and `packages/ui/components.json`).
- prompt-kit is not currently installed. shadcn's `Message` / `Bubble` / `Message Scroller` / `Marker` Base UI variants are not currently installed.

User decisions (locked during brainstorming):

1. **Empty state** — blank canvas with prompt-suggestion chips. No pre-seeded conversation.
2. **Agent scope** — the chat talks to a **supervisor** that can route to any agent/workflow/tool. Not a single-purpose apply agent.
3. **HITL** — risk-gated via `requireApproval: true` on individual tools. Approval requests from sub-agent tools bubble up through the delegation chain and surface in the supervisor's stream as `tool-approval-request` chunks (v6 protocol). Everything else auto-runs.

## Architecture

### Mastra side: add a supervisor agent + switch the chat route to v6

The supervisor pattern replaces the deprecated `.network()` primitive. It uses `Agent.stream()` / `Agent.generate()` internally to delegate to sub-agents, workflows, and tools registered on the supervisor's `agents`, `workflows`, and `tools` fields (per [Supervisor agents](https://mastra.ai/docs/agents/supervisor-agents), `@mastra/core@1.8.0+`).

**`apps/agent/src/mastra/agents/hub-supervisor.ts`** (new):

```ts
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { MODEL_PRESETS } from "#@/mastra/model-config";
import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";
import { createWeatherAgent } from "#@/mastra/agents/weather-agent";
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { weatherWorkflow } from "#@/mastra/workflows/weather-workflow";

export function createHubSupervisor() {
  return new Agent({
    id: "hub-supervisor",
    name: "Hub Supervisor",
    description:
      "Coordinates the user's personal hub: weather, project stacks, and the future apply-to-jobs flow.",
    instructions: `... (see spec for full text) ...`,
    model: MODEL_PRESETS.fullChain,
    agents: {
      weatherAgent: createWeatherAgent(),
      stackCategorizerAgent: createStackCategorizerAgent()
    },
    workflows: {
      weatherWorkflow,
      detectStacksWorkflow,
      organizeStacksWorkflow
    },
    // No `storage` here. Per Mastra memory docs
    // (https://mastra.ai/docs/memory/overview): storage is configured once
    // on the Mastra instance, and the agent's `Memory` inherits it.
    // Sub-agents without their own `memory` field also inherit this.
    memory: new Memory({
      options: { lastMessages: 20 }
    })
  });
}
```

**`apps/agent/src/mastra/index.ts`** (modified — one new line, one config change):

```ts
import { chatRoute, networkRoute } from "@mastra/ai-sdk";
// ... other imports
import { createHubSupervisor } from "#@/mastra/agents/hub-supervisor";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
        version: "v6" // ← changed: was defaulting to v5; v6 is required for the
        //            native tool-approval flow we use (see Risks)
      })
    ]
  },
  agents: {
    weatherAgent: createWeatherAgent(),
    stackCategorizerAgent: createStackCategorizerAgent(),
    hubSupervisor: createHubSupervisor() // ← new
  }
  // ... workflows, scorers, storage, logger, observability unchanged
});
```

**Updates to existing files** (small, additive):

- `apps/agent/src/mastra/agents/weather-agent.ts` — add a `description` field. The supervisor's tool-description generator uses this to decide when to delegate. (See the v5 sub-agent memory inheritance section of the Mastra memory docs: a sub-agent's `description` is the supervisor's signal for delegation, not its memory.)
- `apps/agent/src/mastra/agents/stack-categorizer-agent.ts` — add a `description` field. Same reason.

### oRPC side: protect the existing chat procedures + add `listSuspendedRuns`

The user chose the original direction: switch the existing `chat` and `chatStream` procedures from `publicProcedure` to `protectedProcedure`, and move the dev playground under `__protected/` so the auth change doesn't break it. This makes one chat procedure, one auth model, simpler.

**Important — no separate "resume tool call" oRPC procedure is needed.** The v6 `chatRoute` handler natively handles approval resume: when the client sends a `messages` array containing an `approval-responded` part, the handler calls `extractV6NativeApproval(messages)` (per `chat-route.d.ts:8-23`) which splits the composite `approvalId = "${runId}::${toolCallId}"` to recover the `runId`, then calls `agent.approveToolCall({ runId })` server-side and streams the resumed run back as v6 chunks. The client just calls `chat.addToolApprovalResponse({ id, approved })` on the local `Chat` instance, which updates the part to `state: "approval-responded"` and re-sends via the **same transport** used for normal `sendMessage` calls. So the existing `chatStream` procedure handles both initial messages and approval resume — no new procedure required.

**`packages/api/src/routers/agent.router.ts`** (modified):

```ts
chat: protectedProcedure /* was publicProcedure */
  .route({ description: "Send a message to the agent and get a non-streaming response", method: "POST" })
  .input(z.object({ agentId: agentIdSchema, messages: messagesSchema }))
  .output(z.object({ content: z.string() }))
  .handler(/* unchanged */),

chatStream: protectedProcedure /* was publicProcedure */
  .route({ description: "Stream a chat response from the agent as an event iterator", method: "POST" })
  .input(z.object({ agentId: agentIdSchema, messages: uiMessagesSchema }))
  .handler(async function* ({ input, context }) {
    // Same upstream proxy, but the handler now attaches the authenticated
    // user as `requestContext` for the supervisor's `Memory` and approval
    // snapshots. The v6 chatRoute forwards `requestContext` to
    // `agent.stream()` automatically. The same handler also receives
    // approval-resume messages (the client re-sends via the same transport
    // after chat.addToolApprovalResponse() flips the part state).
    const upstream = await context.agentWorker.fetch(`/chat/${input.agentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": context.session.user.id,
        "X-Thread-Id": `dashboard-home:${context.session.user.id}`
      },
      body: JSON.stringify({
        messages: input.messages,
        requestContext: {
          resourceId: context.session.user.id,
          threadId: `dashboard-home:${context.session.user.id}`
        }
      })
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Agent stream returned ${upstream.status}: ${await upstream.text()}`);
    }
    yield* streamToEventIterator(upstream.body);
  }),

// New: discover pending approvals on a thread. Called LAZILY — not on
// every page load. See §"Failure modes".

listSuspendedRuns: protectedProcedure
  .input(z.object({
    agentId: z.string().default("hub-supervisor"),
    threadId: z.string().min(1),
    resourceId: z.string().min(1)
  }))
  .output(z.array(z.object({
    runId: z.string(),
    toolCalls: z.array(z.object({
      toolCallId: z.string(),
      toolName: z.string(),
      args: z.record(z.unknown()),
      requiresApproval: z.boolean()
    }))
  })))
  .handler(async ({ input, context }) => {
    const upstream = await context.agentWorker.fetch(
      `/agents/${input.agentId}/suspended-runs?threadId=${input.threadId}&resourceId=${input.resourceId}`
    );
    if (!upstream.ok) throw new Error(`List suspended returned ${upstream.status}`);
    return upstream.json();
  })
```

The exact Mastra server paths (`/chat/:agentId`, `/agents/:agentId/approve-tool-call`, `/agents/:agentId/decline-tool-call`, `/agents/:agentId/suspended-runs`) are verified against the installed `@mastra/core@1.50.1` during implementation. The `requestContext` payload is the v6 way to pass per-request data into the supervisor; the v6 chat-route forwards it to `agent.stream()` automatically.

### Web side: the chat UI

The UI uses shadcn Base UI primitives for the message surface, prompt-kit for input/tool/reasoning/markdown, and coss ui for chrome. The chat is wired to the **protected `chatStream`** oRPC procedure and uses the **AI SDK v6 `Chat` instance** so we can call `chat.addToolApprovalResponse()` to resume after a HITL pause. The resume flows through the same `chatStream` procedure (no separate resume endpoint).

**`features/agent-hub/lib/use-hub-chat.ts`** (new) — the chat hook. The key bit: instantiate a `Chat` from `ai` and pass it into `useChat({ chat })`, so the hook delegates to that instance and we can call `chat.addToolApprovalResponse({ id, approved })` to resume after an approval. The transport hits the protected `chatStream` procedure for both initial messages and approval resume.

```ts
import { Chat, type UIMessage } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useHubChat() {
  // Chat is an AI SDK v6 class. useChat binds to it when `chat` is passed
  // in options — that's the documented way to drive approval resume.
  const chat = useMemo(() => new Chat<UIMessage>({ id: "hub-home" }), []);
  return useChat({
    chat,
    id: "hub-home",
    transport: makeHubTransport(chat, orpc),
    resume: false
  });
}
```

(`makeHubTransport` is the per-message transport function. It calls `orpcClient.agent.chatStream({...})` — the now-protected existing procedure — and pipes the oRPC event iterator back into a `ReadableStream<UIMessageChunk>`. The same transport is used for normal `sendMessage` calls and for the auto-resend that `chat.addToolApprovalResponse()` triggers.)

**`features/agent-hub/lib/use-hub-approval.ts`** (new) — the approval hook. Reads the most recent `tool-approval-request` chunk from `chat.messages`, exposes `approve(toolCallId)` and `decline(toolCallId)`, and on click calls `chat.addToolApprovalResponse({ id, approved })`. The `id` from the chunk is the composite `approvalId` (`${runId}::${toolCallId}`, per the v6 `extractV6NativeApproval` helper in `chat-route.d.ts:8-23`). The local `Chat` instance marks the part as `state: "approval-responded"` and re-sends the messages through the same transport. The v6 `chatRoute` server-side calls `extractV6NativeApproval(messages)` to recover the `runId`, invokes `agent.approveToolCall({ runId })` or `agent.declineToolCall({ runId })` to resume the suspended run, and streams the result back through the same `/chat/:agentId` response.

This avoids the two `as never` / `as unknown` casts the existing `useAgentChat` does for cross-version `UIMessage` type identity: we use the `@mastra/ai-sdk` re-exported `SupportedUIMessage` type as the source of truth (or the `ai` package's `UIMessage` directly), so the v6 server and v6 client agree on the same module instance.

## File Layout

```
apps/agent/src/mastra/
  agents/
    weather-agent.ts                  # MODIFIED — add `description` field
    stack-categorizer-agent.ts       # MODIFIED — add `description` field
    hub-supervisor.ts                # NEW — the supervisor agent
  index.ts                           # MODIFIED — add `version: "v6"` to chatRoute; register hubSupervisor

packages/api/src/routers/
    agent.router.ts                    # MODIFIED — protect chat + chatStream; add listSuspendedRuns

apps/web/src/
  routes/(root-layout)/__protected/dashboard/index.tsx       # MODIFIED — swap component ref
  routes/(root-layout)/__protected/dashboard/route.tsx       # MODIFIED — drop unused prefetches (new page doesn't use them)
  routes/(root-layout)/playground/                          # DELETED
  routes/(root-layout)/__protected/playground/              # NEW — playground moved under auth
    index.tsx
    agent/index.tsx
  pages/dashboard/home/
    ui/dashboard-home-page.tsx       # REPLACED — renders <AgentHubPage>
    ui/agent-hub-page.tsx            # NEW — <ClientOnly> wrapper around <AgentHubChat>
    index.ts                         # re-exports
  widgets/agent-hub/
    index.ts                         # NEW
    ui/agent-hub-chat.tsx            # NEW
    ui/agent-hub-empty-state.tsx     # NEW
    ui/agent-hub-message-row.tsx     # NEW
    ui/agent-hub-message-parts.tsx   # NEW
    ui/agent-hub-tool-card.tsx       # NEW
    ui/agent-hub-tool-approval.tsx   # NEW
    ui/agent-hub-prompt-composer.tsx # NEW
    ui/agent-hub-typing-indicator.tsx# NEW
    ui/agent-hub-error-card.tsx      # NEW — see §"Failure modes"
  features/agent-hub/
    index.ts                         # NEW
    lib/
      use-hub-chat.ts                # NEW
      use-hub-approval.ts            # NEW
      hub-suggestions.ts             # NEW
    types.ts                         # NEW
  components/prompt-kit/             # NEW — prompt-kit install target
    prompt-input.tsx, prompt-suggestion.tsx, loader.tsx, markdown.tsx,
    code-block.tsx, tool.tsx, reasoning.tsx, chain-of-thought.tsx
  components/ui/                     # EXTENDED — shadcn Base UI add targets
    message.tsx, bubble.tsx, message-scroller.tsx, marker.tsx
```

The dev playground at `/playground/agent` is moved under `__protected/`. Its `useAgentChat` hook is unchanged and still uses `orpcClient.agent.chatStream` — which is now `protectedProcedure`, so the auth check at the procedure level satisfies the route guard.

## Data Flow

### Happy path (no HITL)

1. User loads the dashboard home. Empty state renders 4 prompt suggestions.
2. User clicks a suggestion. `useHubChat().sendMessage({ text })` is called.
3. The transport calls `orpcClient.agent.chatStream({ agentId: "hub-supervisor", messages })` — the now-protected existing procedure.
4. The oRPC handler forwards to `POST /chat/hub-supervisor` on the agent worker, passing `requestContext: { resourceId: <userId>, threadId: dashboard-home:<userId> }`.
5. The Mastra `chatRoute` runs the supervisor via `agent.stream()`. The supervisor delegates to a sub-agent or workflow based on the request. The full flow is streamed back as AI SDK v6 `UIMessageChunk`s.
6. The client renders each chunk: `text-delta` → message bubble, `reasoning-delta` → reasoning block, `tool-input-available` / `tool-output-available` → tool card.

### HITL path (a tool requires approval)

1. Sub-agent (or supervisor itself) calls a tool marked with `requireApproval: true`. The Mastra agent pauses the run and emits a `tool-approval-request` chunk with `approvalId = "${runId}::${toolCallId}"`.
2. The client renders `AgentHubToolApproval` (the HITL card) inside the message list and shows a sticky "Approval required to continue" notice on the input composer. The input is disabled.
3. User clicks `Approve` or `Decline`.
4. `useHubApproval` calls `chat.addToolApprovalResponse({ id: <approvalId>, approved })` on the local `Chat` instance. The instance re-sends the messages to the chat route, which now sees an `approval-responded` part. The route calls the server-side `approveToolCall` / `declineToolCall` with the `runId` and `toolCallId` it extracts from the composite `approvalId` (per the v6 `extractV6NativeApproval` helper).
5. The supervisor's suspended run resumes. The resumed stream flows back through the same `useChat` transport. The tool card updates from `pending-approval` to `running` to `completed` (or `denied`).

If the user denies, the supervisor's `declineToolCall` returns a stream that includes the supervisor's follow-up message — typically a "no problem, want to try a different role?" continuation. The input composer re-enables. The user does not need to re-send the original message.

### Refresh-resume

- `threadId` is `dashboard-home:<userId>` (stable per user; see §"Failure modes" for the multi-tab caveat).
- The chat widget calls `listSuspendedRuns` **once on mount** when `messages.length === 0`. If there are pending runs, the widget shows a "Resume previous conversation" banner above the empty state. Clicking the banner replays the suspended messages into the local `Chat` so the user can see and act on the pending approval. This is the only call site for `listSuspendedRuns` — no polling, no re-call on every keystroke.
- This avoids a Postgres query on every dashboard render for the common case (the user starts a new conversation, no pending approval).

## Component Composition

```
<AgentHubPage>                       # pages/dashboard/home/ui/agent-hub-page.tsx
  <ClientOnly>                       # SSR guard
    <AgentHubChat>                   # widgets/agent-hub/ui/agent-hub-chat.tsx
      <AgentHubEmptyState />         # shown when messages.length === 0
      <MessageScroller>              # shadcn (Base UI)
        <AgentHubMessageRow>         # per message
          <AgentHubMessageParts>     # switch on part type
            text → <MessageContent><Bubble><Markdown /></Bubble></MessageContent>
            reasoning → <Reasoning> (prompt-kit)
            tool → <AgentHubToolCard>
              tool-approval-request state → <AgentHubToolApproval>
      <AgentHubPromptComposer>       # prompt-kit PromptInput
        <AgentHubTypingIndicator />  # status === submitted | streaming
      </AgentHubChat>
  <AgentHubErrorCard />              # shown when chat errors
```

`AgentHubToolApproval` reads the `tool-approval-request` payload from the message and renders two actions:

- `Approve` (primary coss Button) → calls `useHubApproval().approve(toolCallId)`
- `Decline` (destructive outline coss Button) → calls `useHubApproval().decline(toolCallId)`

The card is generic — it works for any future `requireApproval: true` tool.

## Failure modes

These were identified during the tech-lead review and are now addressed:

| Mode                            | Behavior                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent worker down**           | `useHubChat` errors with a friendly "Hub is unavailable. Try again in a moment." card. A `Retry` button re-sends the last user message. No retry-on-mount loop.                                                                                                                                                                                                                          |
| **Mid-session auth loss**       | The next oRPC call returns 401. `useChat` surfaces the error; the chat freezes; a "Sign in again" CTA replaces the input composer. (No silent state corruption.)                                                                                                                                                                                                                         |
| **Tool error**                  | The tool card body shows the `errorText` from the `tool-output-error` chunk in a coss `Alert` (variant `destructive`). The chat continues — the user can ask the supervisor to retry.                                                                                                                                                                                                    |
| **Denial**                      | The supervisor's follow-up stream continues with its next message. The input composer re-enables. No re-send needed.                                                                                                                                                                                                                                                                     |
| **Browser offline mid-stream**  | The `useChat` transport errors. The chat shows "Reconnecting..." with a manual `Retry` button. The `reconnectToStream` API is still unsupported (matches the existing `useAgentChat` behavior).                                                                                                                                                                                          |
| **Multi-tab same-user**         | The `threadId` is per-user, not per-tab, so two tabs share the same conversation. Approval in tab A will mark the run as `approval-responded` in the supervisor's storage, and tab B will see the resumed run on its next chunk. (This is acceptable for v1; multi-tab isolation is a future enhancement — `threadId` could be suffixed with a per-tab UUID stored in `sessionStorage`.) |
| **Lazy `listSuspendedRuns`**    | Called once on mount when `messages.length === 0`. No polling, no re-call on every render. If a pending run exists, a "Resume" banner surfaces it; otherwise the call is a no-op round-trip.                                                                                                                                                                                             |
| **Suspended run not resumable** | If the run is too old to resume (snapshots evicted), the chat surfaces "This conversation is too old to resume. Start a new one?" and offers a `New conversation` button.                                                                                                                                                                                                                |
| **Snapshot verification**       | A manual test step in §Validation proves snapshots actually persist: pause a tool, kill the agent worker, restart, and confirm `listSuspendedRuns` still returns the run.                                                                                                                                                                                                                |

## Visual Design

### Design language (per `impeccable`)

The chat surface is the dashboard's first impression. It must avoid the AI slop tells that make a UI guessable as "AI made that":

- **No numbered 01/02/03 section markers.** No uppercase tracked eyebrows ("CHAT" / "TOOLS") above headings. No gradient text. No glassmorphism as a default. No side-stripe borders on cards/list items. No identical card grids — the four suggestions below vary in size, weight, and visual weight rather than being a uniform `repeat(2, 1fr)` of identical cards.
- **Contrast**: body text ≥ 4.5:1 against background; large text (≥18px or bold ≥14px) ≥ 3:1. Placeholder text in the input also ≥ 4.5:1. Tinted-neutrals are a hair of chroma toward the brand's hue, not toward warm-by-default cream.
- **Typography**: body line-length capped at 65–75ch. `text-wrap: balance` on the empty-state h1 and the "Welcome back" h1 in the chat header. Display letter-spacing ≥ -0.04em (the codex default of -0.05 to -0.085em makes letters touch and reads as cramped; -0.02 to -0.03em is plenty).
- **z-index scale** (semantic, not arbitrary): `dropdown` → `sticky` → `modal-backdrop` → `modal` → `toast` → `tooltip`. The approval card's sticky notice uses `sticky`; the `coss Sheet` for "Edit first" uses `modal-backdrop` + `modal`.
- **Motion** (per `transitions-dev`): ease-out-quart or ease-out-expo curves; no bounce, no elastic. Every animation ships a `prefers-reduced-motion: reduce` alternative. Specific transitions are listed in §Motion patterns below.
- **The "AI slop" test**: someone looking at this should not be able to guess "AI made that" from the dashboard alone. The four suggestions are not a uniform grid; the empty state has rhythm; the tool cards are not a stamp.

### Layout

- **Empty state**: centered greeting ("Welcome back. What can I do for you?") with `text-wrap: balance`, 1-line sub, then four `<PromptSuggestion>` chips. The four are arranged in a deliberately varied layout — not `repeat(2, 1fr)` identical cards. The two more-likely-to-be-clicked suggestions (weather, apply) get visual weight via subtle background tint and a leading icon; the two power-user ones (detect stacks, clean library) are quieter inline chips. The eye lands on the right action, not on a uniform wall. This is the "category-reflex check" answer: a uniform 2×2 grid is what an LLM defaults to. We don't.
  1. "What's the weather in Berlin?" — leading icon, primary weight
  2. "Detect stacks for my project" — inline chip
  3. "Help me apply to a job" — leading icon, primary weight (establishes the apply flow)
  4. "Clean up my stack library" — inline chip
- **First message onwards**: standard chat layout, input docked bottom, messages fill the scroller. Header above the scroller shows the agent's name (`Hub Supervisor`) + a small status dot (coss `Badge` with `Sparkles` icon).
- **Message rows**: user right-aligned with `Bubble variant="default"`, assistant left-aligned with `Bubble variant="ghost"` (unframed so markdown spans full width). Max width ~72ch so long assistant responses don't span the full viewport.
- **Avatars**: "You" via coss `Avatar` with initials, "Agent" via coss `Avatar` with a `Sparkles` icon fallback.
- **Tool card**: collapsible (per `transitions-dev/21-accordion`), status pill in the header (spinner / `Check` / `X` / `AlertTriangle`).
- **Tool error**: body shows the `errorText` in a coss `Alert` (destructive).
- **HITL approval card**: nested in the tool card. Shows `toolName`, `args`, and "Why this needs your approval". `Approve` (primary) / `Decline` (destructive outline) in a button group. Sticky "Approval required to continue" notice on the input.
- **Reasoning**: prompt-kit `Reasoning`, collapsed by default with a `ReasoningTrigger` showing "Thought for Xs".
- **Loader**: prompt-kit `Loader` variant `typing` for "Agent is typing" → first text chunk swap (see §Motion).
- **Mobile**: suggestions stack vertically; approval buttons wrap; sheet opens full-width.

### Motion patterns (per `transitions-dev`)

Every motion below ships a `prefers-reduced-motion: reduce` crossfade alternative.

| Surface                                               | Transition                                                                                       | Reference                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Empty state greeting + sub + suggestions (first load) | `texts-reveal` — staggered blurred rise; per-line 80ms delay                                     | `reference/18-texts-reveal.md`       |
| "Agent is typing…" → first real text chunk            | `text-states-swap` — blurred up-and-down swap                                                    | `reference/04-text-states-swap.md`   |
| Error card on the chat                                | `error-state-shake` — per-segment cubic-bezier shake with auto-reverting border                  | `reference/12-error-state-shake.md`  |
| Tool card body expand/collapse                        | `accordion` — `grid-rows` track; chevron flips via `scaleY(-1)` (NOT path morph — Chromium-only) | `reference/21-accordion.md`          |
| Tool result status pill on success                    | `success-check` — fade + rotate + Y-bob + path stroke-draw                                       | `reference/10-success-check.md`      |
| Approval pending count badge (multiple pending)       | `notification-badge` — slide + dot pop                                                           | `reference/03-notification-badge.md` |
| Tool card placeholder → real content                  | `skeleton-reveal` — crossfade + cross-blur                                                       | `reference/14-skeleton-reveal.md`    |

Streaming text uses the natural AI SDK chunk-by-chunk rendering; no extra motion is layered on top (the chunk cadence is the motion).

### Accessibility (per `impeccable`)

- `prefers-reduced-motion: reduce` honored on every motion above.
- Keyboard: `Tab` reaches every interactive element in order; `Enter` submits; `Shift+Enter` adds a newline; `Esc` does NOT close the approval card (forcing a decision).
- Focus ring: every focusable element shows a 2px focus ring matching the brand's primary color at 60% opacity.
- `aria-label` on every icon-only button (copy, send, stop, approve, decline).
- `aria-live="polite"` on the message scroller so screen readers announce new assistant chunks.
- Color is not the only signal for tool state: the status pill has an icon (spinner / `Check` / `X` / `AlertTriangle`) and text, not just a color.

### FSD Boundaries

## Validation

Per `verification-before-completion`: every claim in this section must be backed by a command run in the same message, with the full output visible. No "should pass" wording. No "looks correct" claims. The implementation is not done until each step's command has been run and its output read.

Per `.agents/workflow.md` and the project AGENTS.md:

1. **`pnpm lint`** — must pass clean. Paste the final summary line (`✔ No ESLint errors found` or equivalent).
2. **`pnpm typecheck`** — must pass clean. Paste the final summary. The v6 `UIMessage` and the `Chat` class from `@ai-sdk/react@2.0.212` should align on the same `ai` package version, eliminating the cross-version cast that `useAgentChat` still uses. Verify the import is from `@ai-sdk/react` (not `@ai-sdk/react/v5`) and that the installed `ai` is v6.
3. **`pnpm dev` (web) + the `dev` script from `apps/agent/package.json`** — verify by hand, then capture the actual results in the commit message. Each item below is a separate manual check with a discrete outcome:
   - Empty state shows 4 suggestions and the greeting. ✓/✗
   - Clicking suggestion 1 (weather) routes to the `weatherAgent` and returns a forecast. ✓/✗
   - Clicking suggestion 2 (detect stacks) routes to the `detectStacksWorkflow` and streams progress events. ✓/✗
   - Clicking suggestion 3 (apply) returns a roadmap-style message. ✓/✗
   - **HITL manual test**: temporarily set `requireToolApproval: true` on the supervisor's `defaultOptions` (or add `requireApproval: true` to a temporary tool). Click a suggestion. The HITL card appears with the tool name and args. Click `Approve` — the supervisor resumes. Click `Decline` — the supervisor's follow-up message arrives and the input re-enables. ✓/✗
   - **Snapshot verification**: pause a tool, kill the agent worker (`pkill -f "mastra"`), restart with `pnpm dev`, hit `listSuspendedRuns` directly — the paused run is still listed. ✓/✗
4. **Keyboard**: `Tab` order is sensible; `Enter` submits; `Esc` does not close the approval card. ✓/✗
5. **Mobile breakpoint check at 375px width** — captured screenshot. ✓/✗
6. **Failure-mode check**: stop the agent worker, reload the dashboard — the error card appears with a `Retry` button. ✓/✗
7. **Reduced motion**: set `prefers-reduced-motion: reduce` in the OS or DevTools, reload — the texts-reveal, accordion, text-states-swap all degrade to crossfades or instant transitions. ✓/✗

No tests are added (project convention: tests only when explicitly requested).

## FSD Boundaries

- **Routes** (`apps/web/src/routes/`): swap the component reference in `dashboard/index.tsx` to the new `AgentHubPage`. Use **`.lazy.tsx`** code splitting per the TanStack Router `split-lazy-routes` rule — the chat widget is a sizable JS payload (prompt-kit, shadcn Base UI, coss ui) and the dashboard home is the most-visited route. The `index.tsx` route file stays thin: import the lazy component, wire `beforeLoad` (with `ensureQueryData` per `tanstack-router-best-practices/load-ensure-query-data` — the new page has no prefetches, so this is a no-op call). Update `dashboard/route.tsx` to drop the `orpcQueryClient.githubConfig.get.queryOptions()` prefetch (the new page doesn't use it) and the `experiences.list` / `projects.list` prefetches (no resume stats).
- **Pages** (`apps/web/src/pages/dashboard/home/`): thin `<ClientOnly>` wrapper around `<AgentHubChat />`.
- **Widgets** (`apps/web/src/widgets/agent-hub/`): presentational composition.
- **Features** (`apps/web/src/features/agent-hub/`): all client-side chat wiring.
- **Shared** (`apps/web/src/shared/ui/`): no changes.
- **`packages/ui`**: no changes.
- **`packages/api`**: `agentRouter` grows three new procedures; existing public `chat` / `chatStream` are unchanged.
- **`apps/agent`**: one new agent, two `description` additions, two changes to `index.ts` (`version: "v6"`, register `hubSupervisor`).

## Validation

Per `.agents/workflow.md` and the project AGENTS.md:

1. `pnpm lint` — must pass clean.
2. `pnpm typecheck` — must pass clean. The v6 `UIMessage` and the `Chat` class from `@ai-sdk/react@2.0.212` should align on the same `ai` package version, eliminating the cross-version cast that `useAgentChat` still uses. Verify the import is from `@ai-sdk/react` (not `@ai-sdk/react/v5`) and that the installed `ai` is v6.
3. `pnpm dev` (web) + `pnpm dev` (agent, via the script in `apps/agent/package.json`) — verify:
   - Empty state shows 4 suggestions and the greeting.
   - Clicking suggestion 1 (weather) routes to the `weatherAgent` and returns a forecast.
   - Clicking suggestion 2 (detect stacks) routes to the `detectStacksWorkflow` and streams progress events.
   - Clicking suggestion 3 (apply) currently has no matching tool — the supervisor responds with a "I don't have an apply tool yet, on the roadmap" message. Verify the suggestion copy is consistent.
   - **HITL manual test**: temporarily set `requireToolApproval: true` on the supervisor's `defaultOptions` (or add `requireApproval: true` to a temporary tool). Click a suggestion. The HITL card appears with the tool name and args. Click `Approve` — the supervisor resumes. Click `Decline` — the supervisor's follow-up message arrives and the input re-enables.
   - **Snapshot verification**: pause a tool, kill the agent worker (`pkill -f "mastra"`), restart with `pnpm dev`, hit `listSuspendedRuns` directly — the paused run is still listed. (The run can then be resumed on the dashboard.)
4. Keyboard: `Tab` order is sensible; `Enter` submits; `Esc` does not close the approval card.
5. Mobile breakpoint check at 375px width.
6. Failure-mode check: stop the agent worker, reload the dashboard — the error card appears with a `Retry` button.

No tests are added (project convention: tests only when explicitly requested).

## Risks & Open Questions

- **The `chatRoute` default version is v5 in `@mastra/ai-sdk@1.6.1`.** The spec changes the route to `version: "v6"`. This is required because the v6 native tool-approval flow (`tool-approval-request` chunk + `Chat.addToolApprovalResponse` + `extractV6NativeApproval`) only works on a v6 stream. The existing `/playground/agent` continues to work because it parses the SSE response generically and doesn't care about chunk-type names.
- **Auth boundary is `protectedProcedure` on the existing `chat` + `chatStream` (per user direction)**: the dev playground is moved under `__protected/` as the mitigation. The new `listSuspendedRuns` is also `protectedProcedure`. One chat procedure, one auth model.
- **No `resumeToolCall` oRPC procedure is needed.** The v6 `chatRoute` handler calls `extractV6NativeApproval(messages)` (`chat-route.d.ts:8-23`) on every incoming `messages` array, finds the most recent `approval-responded` part, splits its composite `approvalId = "${runId}::${toolCallId}"` to recover the `runId`, and invokes `agent.approveToolCall({ runId })` or `agent.declineToolCall({ runId })` server-side. The client only needs `chat.addToolApprovalResponse({ id, approved })` on the local `Chat` instance, which updates the part state and re-sends through the same `chatStream` transport. Adding a separate `resumeToolCall` procedure would duplicate the chat route's built-in behavior.
- **Supervisor id / registration key consistency**: the supervisor's `id: "hub-supervisor"` and the Mastra registration key `hubSupervisor: createHubSupervisor()` follow the same pattern as the existing `weatherAgent` (id `"weather-agent"`, key `"weatherAgent"`) and `stackCategorizerAgent` (id `"stack-categorizer"`, key `"stackCategorizerAgent"`). The id is the AI SDK / Mastra agent identifier; the registration key is the in-memory lookup name. They differ by design and are not required to match.
- **Mastra server API paths**: the exact HTTP paths for `approve-tool-call`, `decline-tool-call`, and `suspended-runs` are verified against the installed `@mastra/core@1.50.1` during implementation. The spec assumes `/agents/:agentId/approve-tool-call` and `/agents/:agentId/suspended-runs` per the Agent approval docs; the implementation will adjust if the installed version differs.
- **`description` field on sub-agents**: the new `description` fields on `weatherAgent` and `stackCategorizerAgent` are short one-sentence summaries that the supervisor embeds into its tool list. Some AI SDK providers truncate or reject descriptions over ~256 characters. Implementation will keep each `description` under 200 characters.
- **AI SDK v6 `Chat` class**: `addToolApprovalResponse` is a method on the `Chat` class (`@ai-sdk/react@2.0.212` exposes it via the `Chat` import). The pattern is `useChat({ chat: new Chat(...) })` so the hook delegates to the instance. Confirmed by reading the installed types at `@mastra+ai-sdk@1.6.1_*/_types/@internal_ai-v6/dist/index.d.ts:80`.
- **shadcn Base UI variants in `base-maia` style**: shadcn's Base UI components are typically styled for the default shadcn theme. The project already uses coss (Base UI), so the variants install into the right primitive tree. Style adjustments are likely — confirmed during implementation; fallback is app-local style overrides in `apps/web/src/components/ui/`.
- **Install command**: the spec uses `vpx shadcn@latest add <name>` from the `apps/web` directory, per `apps/web/package.json:11` (`"ui": "vpx shadcn@latest"`). Not `pnpm ui add` — that script doesn't exist.
- **Apply flow is aspirational**: no `applyAgent` sub-agent exists yet. Suggestion 3 ("Help me apply to a job") returns a roadmap-style message. When the `applyAgent` lands, it registers on the supervisor and the suggestion starts routing to it.
- **Snapshots + storage**: `chatRoute` with `version: "v6"` and the default `agent.stream()` execution persists snapshots to the configured `PostgresStore`. The implementation will verify by reading a sample `listSuspendedRuns` response after a synthetic approval, killing the worker, restarting, and confirming the run is still listed. (Captured in §Validation step 3.)
- **prompt-kit + shadcn Base UI coexistence**: prompt-kit was built for shadcn/Radix. It may pull `radix-ui` transitively. `packages/ui` already lists `radix-ui` as a catalog dependency. We do not block on this.
- **Multi-tab same-user**: see §"Failure modes". Acceptable for v1.

## Out of Scope (YAGNI)

- Building the `applyAgent` and its tools. The chat widget is ready for it when it ships.
- Voice input, file upload, image attachments.
- Multi-conversation sidebar.
- Per-thread history browser.
- i18n keys.
- Tests (project default).
- Multi-tab isolation (see §"Failure modes" for the per-user `threadId` trade-off).

## Implementation Order

**Step 0 (worktree setup, per `using-git-worktrees`)**: before any code changes, create an isolated worktree.

```bash
# Verify .worktrees/ is git-ignored (or add it)
git -C /Users/salah/Developer/personal-hub check-ignore -q .worktrees || \
  echo ".worktrees/" >> /Users/salah/Developer/personal-hub/.gitignore

# Create worktree
git -C /Users/salah/Developer/personal-hub worktree add \
  /Users/salah/Developer/personal-hub/.worktrees/dashboard-hub-chat \
  -b feat/dashboard-hub-chat

# Run setup
cd /Users/salah/Developer/personal-hub/.worktrees/dashboard-hub-chat && pnpm install

# Verify clean baseline
pnpm lint && pnpm typecheck
```

Only proceed if both pass. If either fails on `main`, report and resolve before starting.

1. **Mastra side**: add `description` to `weatherAgent` and `stackCategorizerAgent`. Add `apps/agent/src/mastra/agents/hub-supervisor.ts`. Edit `apps/agent/src/mastra/index.ts` to add `version: "v6"` to `chatRoute` and register `hubSupervisor`. Verify by running the dev script (`pnpm dev` in `apps/agent/`) and curling `POST /chat/hub-supervisor` with a sample payload.
2. **oRPC side**: change `chat` and `chatStream` from `publicProcedure` to `protectedProcedure`; add `listSuspendedRuns` to `agentRouter`. Move the playground route under `__protected/` so the auth change doesn't break it. Verify by hitting each endpoint via the agent worker while signed in.
3. **Install web deps**: from `apps/web/`, run `vpx shadcn@latest add message bubble message-scroller marker` and the prompt-kit primitives (`npx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"` etc.). Install the `transitions-dev` `_root.css` block into the project's global stylesheet so all transition CSS variables are available.
4. **Web slice**: build `features/agent-hub/lib/` bottom-up (`use-hub-chat.ts` → `use-hub-approval.ts` → `hub-suggestions.ts`). Set up a query key factory in `features/agent-hub/api/query-keys.ts` per `tanstack-query-best-practices/qk-factory-pattern`. Wrap the chat surface in an error boundary that uses `useQueryErrorResetBoundary` per `tanstack-query-best-practices/err-error-boundaries`.
5. **Web widgets**: build `widgets/agent-hub/ui/` bottom-up (`agent-hub-error-card.tsx` → `agent-hub-message-parts.tsx` → `agent-hub-tool-card.tsx` → `agent-hub-tool-approval.tsx` → `agent-hub-message-row.tsx` → `agent-hub-prompt-composer.tsx` → `agent-hub-typing-indicator.tsx` → `agent-hub-empty-state.tsx` → `agent-hub-chat.tsx`). Each widget that uses motion references the corresponding `transitions-dev` snippet and ships the `prefers-reduced-motion` block verbatim.
6. **Wire route**: create `pages/dashboard/home/ui/agent-hub-page.tsx` as the page wrapper. Create `routes/(root-layout)/__protected/dashboard/index.lazy.tsx` per `tanstack-router-best-practices/split-lazy-routes` for code splitting the chat widget. Swap the route's `index.tsx` component reference, delete the old `dashboard-home-page.tsx` resume-overview code (file is rewritten), update `dashboard/route.tsx` to drop the now-unused prefetches.
7. **Manual verification**: per §Validation, exercise all four suggestions, the HITL flow (with a temporary `requireToolApproval: true`), and the failure modes. Run `pnpm lint`, `pnpm typecheck`, and capture actual output for each validation step. The implementation is not done until every check in §Validation has a ✓ next to a captured output or screenshot in the commit message.
