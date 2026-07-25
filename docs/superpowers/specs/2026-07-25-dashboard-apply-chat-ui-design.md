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

### oRPC side: a new `protectedChatStream` + a `resumeToolCall` procedure

The user's prior direction was to make `chat` and `chatStream` `protectedProcedure`. The cleaner alternative, surfaced during the tech-lead review, is to **keep the existing public `chat`/`chatStream` (used by the dev playground) and add a new `protectedChatStream` for the dashboard**. Reasons:

- Auth boundary is explicit at the call site (production dashboard vs. dev playground).
- Avoids the unrequested scope of moving the playground route.
- Keeps the playground working as-is.

If the user prefers the prior direction (protect the existing procedures and move the playground), the change is mechanical — the same chat-streaming logic moves into the protected procedure and the playground moves under `__protected/`. The spec defaults to the cleaner alternative; flagging the choice below.

**`packages/api/src/routers/agent.router.ts`** (modified):

```ts
// Existing: public chat + chatStream. Unchanged. Used by the playground.

chat: publicProcedure /* unchanged */
  .route({ description: "Send a message to the agent and get a non-streaming response", method: "POST" })
  .input(z.object({ agentId: agentIdSchema, messages: messagesSchema }))
  .output(z.object({ content: z.string() }))
  .handler(/* unchanged */),

chatStream: publicProcedure /* unchanged */
  .route({ description: "Stream a chat response from the agent as an event iterator", method: "POST" })
  .input(z.object({ agentId: agentIdSchema, messages: uiMessagesSchema }))
  .handler(/* unchanged — body still proxies to /chat/:agentId */),

// New: protected streaming for the dashboard. The handler attaches the
// authenticated user as a RequestContext so the supervisor's `Memory` and
// approval snapshots can scope to that user.

protectedChatStream: protectedProcedure
  .route({ description: "Stream a chat response as the authenticated user", method: "POST" })
  .input(z.object({
    agentId: z.string().default("hub-supervisor"),
    messages: uiMessagesSchema
  }))
  .handler(async function* ({ input, context }) {
    const upstream = await context.agentWorker.fetch(
      `/chat/${input.agentId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": context.session.user.id,
          "X-Thread-Id": `dashboard-home:${context.session.user.id}`
        },
        body: JSON.stringify({
          messages: input.messages,
          // requestContext is the v6 way to pass per-request data into the
          // supervisor (resourceId, threadId, anything else).
          requestContext: {
            resourceId: context.session.user.id,
            threadId: `dashboard-home:${context.session.user.id}`
          }
        })
      }
    );
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Agent stream returned ${upstream.status}: ${await upstream.text()}`);
    }
    yield* streamToEventIterator(upstream.body);
  }),

// New: HITL resume. Single procedure, two decisions, two paths on the
// agent worker. `toolCallId` is REQUIRED — the Mastra v6 approve/decline
// server methods require it (the optional-form assumption from the
// earlier spec was wrong; verified against the installed @mastra/ai-sdk
// source).

resumeToolCall: protectedProcedure
  .input(z.object({
    agentId: z.string().default("hub-supervisor"),
    runId: z.string().min(1),
    toolCallId: z.string().min(1),
    decision: z.enum(["approve", "decline"])
  }))
  .handler(async function* ({ input, context }) {
    const path = input.decision === "approve"
      ? `/agents/${input.agentId}/approve-tool-call`
      : `/agents/${input.agentId}/decline-tool-call`;

    const upstream = await context.agentWorker.fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": context.session.user.id
      },
      body: JSON.stringify({
        runId: input.runId,
        toolCallId: input.toolCallId
      })
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Resume returned ${upstream.status}: ${await upstream.text()}`);
    }
    yield* streamToEventIterator(upstream.body);
  }),

// New: discover pending approvals on a thread. The implementation spec
// calls this LAZILY — not on every page load. See §"Failure modes".

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

The UI uses shadcn Base UI primitives for the message surface, prompt-kit for input/tool/reasoning/markdown, and coss ui for chrome. The chat is wired to `protectedChatStream` (not the public one) and uses the **AI SDK v6 `Chat` instance** so we can call `chat.addToolApprovalResponse()` to resume after a HITL pause.

**`features/agent-hub/lib/use-hub-chat.ts`** (new) — the chat hook. The key bit: instantiate a `Chat` from `ai` and pass it into `useChat({ chat })`, so the hook delegates to that instance and we can call `chat.addToolApprovalResponse({ id, approved })` to resume after an approval.

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

(`makeHubTransport` is the per-message transport function. It calls `orpcClient.protectedAgent.protectedChatStream({...})` and pipes the oRPC event iterator back into a `ReadableStream<UIMessageChunk>`.)

**`features/agent-hub/lib/use-hub-approval.ts`** (new) — the approval hook. Reads the most recent `tool-approval-request` chunk from `chat.messages`, exposes `approve(toolCallId)` and `decline(toolCallId)`, and on click calls `chat.addToolApprovalResponse({ id, approved })`. The `approvalId` from the chunk is composite: `${runId}::${toolCallId}` (per the v6 `extractV6NativeApproval` helper in `chat-route.d.ts:8-23`). We split it to recover the `runId` for the oRPC `resumeToolCall` server-side call, AND we hand the composite `approvalId` to `chat.addToolApprovalResponse()` so the local `Chat` instance can mark the part as `approval-responded`. The local `Chat` then re-sends the messages to the same chat route with the resume data extracted, and the server resumes the suspended run.

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
  agent.router.ts                    # MODIFIED — add protectedChatStream, resumeToolCall, listSuspendedRuns

apps/web/src/
  routes/(root-layout)/__protected/dashboard/index.tsx       # MODIFIED — swap component ref
  routes/(root-layout)/__protected/dashboard/route.tsx       # MODIFIED — drop githubConfig prefetch (new page doesn't use it)
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

`apps/web/src/features/agent/` (the agent playground at `/playground/agent`) and the `/playground/agent` route are untouched. The dev playground continues to use the existing public `chat`/`chatStream` oRPC procedures.

## Data Flow

### Happy path (no HITL)

1. User loads the dashboard home. Empty state renders 4 prompt suggestions.
2. User clicks a suggestion. `useHubChat().sendMessage({ text })` is called.
3. The transport calls `orpcClient.protectedAgent.protectedChatStream({ agentId: "hub-supervisor", messages })`.
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
- The chat widget does NOT call `listSuspendedRuns` on every page load. It calls it lazily in one of these cases:
  - The `useChat` stream errors with a "suspended" indicator. (Future — the AI SDK may not surface this in v6 yet; the implementation will verify.)
  - The user explicitly clicks a "Resume" button on an empty state placeholder (only shown if `messages.length === 0` and a previous session ended mid-approval).
  - The supervisor's `runId` is missing from a chunk that needs it.
- This avoids a Postgres query on every dashboard render for the common case (no pending approval).

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
| **Lazy `listSuspendedRuns`**    | Only called on explicit triggers (see §"Refresh-resume"), not on every page load. Avoids wasted Postgres round-trips.                                                                                                                                                                                                                                                                    |
| **Suspended run not resumable** | If the run is too old to resume (snapshots evicted), the chat surfaces "This conversation is too old to resume. Start a new one?" and offers a `New conversation` button.                                                                                                                                                                                                                |
| **Snapshot verification**       | A manual test step in §Validation proves snapshots actually persist: pause a tool, kill the agent worker, restart, and confirm `listSuspendedRuns` still returns the run.                                                                                                                                                                                                                |

## Visual Design

- **Empty state**: centered greeting ("Welcome back. What can I do for you?") + 1-line sub + 2×2 grid of `<PromptSuggestion>` chips:
  1. "What's the weather in Berlin?"
  2. "Detect stacks for my project"
  3. "Help me apply to a job" ← establishes the apply flow without making it the only flow
  4. "Clean up my stack library"
- **First message onwards**: standard chat layout, input docked bottom, messages fill the scroller.
- **Message rows**: user right-aligned with `Bubble variant="default"`, assistant left-aligned with `Bubble variant="ghost"` (unframed so markdown spans full width).
- **Avatars**: "You" via coss `Avatar` with initials, "Agent" via coss `Avatar` with a `Sparkles` icon fallback.
- **Tool card**: collapsible, status pill (spinner / `Check` / `X` / `AlertTriangle`).
- **Tool error**: body shows the `errorText` in a coss `Alert` (destructive).
- **HITL approval card**: nested in the tool card. Shows `toolName`, `args`, and "Why this needs your approval". `Approve` (primary) / `Decline` (destructive outline) in a button group. Sticky "Approval required to continue" notice on the input.
- **Reasoning**: prompt-kit `Reasoning`, collapsed by default.
- **Loader**: prompt-kit `Loader` variant `typing` for "Agent is typing".
- **Mobile**: suggestions stack vertically; approval buttons wrap.

## FSD Boundaries

- **Routes** (`apps/web/src/routes/`): swap the component reference in `dashboard/index.tsx` to the new `AgentHubPage`. Update `dashboard/route.tsx` to drop the `orpcQueryClient.githubConfig.get.queryOptions()` prefetch (the new page doesn't use it) and the `experiences.list` / `projects.list` prefetches (no resume stats).
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
- **`ProtectedChatStream` vs. protected existing routes**: the user previously asked for the existing `chat`/`chatStream` to be `protectedProcedure`. This spec takes the alternative path (new `protectedChatStream`, public routes unchanged, playground unaffected) on the grounds that auth boundaries should be explicit at the call site. If the user wants the prior direction, the swap is mechanical: rename `protectedChatStream` back to `chatStream`, change `publicProcedure` to `protectedProcedure` on the existing one, and move the playground under `__protected/`. **This is the one open question for the user.**
- **Mastra server API paths**: the exact HTTP paths for `approve-tool-call`, `decline-tool-call`, and `suspended-runs` are verified against the installed `@mastra/core@1.50.1` during implementation. The spec assumes `/agents/:agentId/approve-tool-call` and `/agents/:agentId/suspended-runs` per the Agent approval docs; the implementation will adjust if the installed version differs.
- **`requestContext` propagation**: the oRPC handler passes `resourceId` and `threadId` as `requestContext` in the request body. The v6 `chatRoute` forwards `requestContext` to `agent.stream()` automatically. Confirmed against the v6 handler signature in `chat-route.d.ts:25-31`.
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

1. **Mastra side**: add `description` to `weatherAgent` and `stackCategorizerAgent`. Add `apps/agent/src/mastra/agents/hub-supervisor.ts`. Edit `apps/agent/src/mastra/index.ts` to add `version: "v6"` to `chatRoute` and register `hubSupervisor`. Verify by running the dev script (`pnpm dev` in `apps/agent/`) and curling `POST /chat/hub-supervisor` with a sample payload.
2. **oRPC side**: add `protectedChatStream`, `resumeToolCall`, `listSuspendedRuns` to `agentRouter`. Verify by hitting each endpoint via the agent worker.
3. **Install web deps**: from `apps/web/`, run `vpx shadcn@latest add message bubble message-scroller marker` and the prompt-kit primitives (`npx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"` etc.).
4. **Web slice**: build `features/agent-hub/lib/` bottom-up (`use-hub-chat.ts` → `use-hub-approval.ts` → `hub-suggestions.ts`).
5. **Web widgets**: build `widgets/agent-hub/ui/` bottom-up (`agent-hub-error-card.tsx` → `agent-hub-message-parts.tsx` → `agent-hub-tool-card.tsx` → `agent-hub-tool-approval.tsx` → `agent-hub-message-row.tsx` → `agent-hub-prompt-composer.tsx` → `agent-hub-typing-indicator.tsx` → `agent-hub-empty-state.tsx` → `agent-hub-chat.tsx`).
6. **Wire route**: create `pages/dashboard/home/ui/agent-hub-page.tsx`, swap the route's component reference, delete the old `dashboard-home-page.tsx` resume-overview code (file is rewritten), update `dashboard/route.tsx` to drop the now-unused prefetches.
7. **Manual verification**: per §Validation, exercise all four suggestions, the HITL flow (with a temporary `requireToolApproval: true`), and the failure modes.
