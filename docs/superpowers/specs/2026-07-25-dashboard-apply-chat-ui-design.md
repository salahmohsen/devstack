# Dashboard Home → Mastra Hub Chat (Supervisor)

**Status:** Pending user approval.

## Goal

Replace the current dashboard home page (a static resume overview) with a production-quality AI chat interface backed by a **Mastra supervisor agent** that has access to every tool, workflow, and sub-agent registered in `apps/agent/`. The dashboard home becomes a general "talk to your hub" surface — the user can ask for the weather, categorize stacks, run the detect-stacks workflow, ask about their resumes, or trigger the future apply-to-jobs flow. The supervisor decides which primitive to call based on the user's intent. This also establishes the apply-to-jobs flow as one capability of the hub, not its sole purpose.

## Background & Constraints

- `apps/agent/src/mastra/index.ts` already registers `chatRoute({ path: "/chat/:agentId" })` from `@mastra/ai-sdk` v1.6.1, plus all the existing agents and workflows. Any new agent registered in the Mastra instance is automatically reachable at `/chat/<agentId>` with no additional server code.
- The existing agents are `weatherAgent` (id `weather-agent`, has `weatherTool`) and `stackCategorizerAgent` (id `stack-categorizer`, no tools). The existing workflows are `weatherWorkflow`, `detectStacksWorkflow`, `organizeStacksWorkflow`. None are currently wired to a chat-facing agent.
- The oRPC `agentRouter` already exposes `agent.chat` (non-streaming) and `agent.chatStream` (streaming) — the streaming route proxies `/chat/:agentId` from the agent worker and converts the response to an oRPC event iterator that `useChat` consumes (see `packages/api/src/routers/agent.router.ts:209-239`).
- The dashboard home currently renders a resume overview (`pages/dashboard/home/dashboard-home-page.tsx`) with cards for experiences, projects, and stacks. The replace is full — the file is rewritten, not extended.
- `packages/ui` is coss-based (`base-maia` style, `stone` base color, Lucide icons). shadcn CLI registries are configured (`apps/web/components.json` and `packages/ui/components.json`).
- prompt-kit is not currently installed. shadcn's `Message` / `Bubble` / `Message Scroller` / `Marker` Base UI variants are not currently installed.

User decisions (locked during brainstorming):

1. **Empty state** — blank canvas with prompt-suggestion chips. No pre-seeded conversation.
2. **Agent scope** — the chat talks to a **supervisor** that can route to any agent/workflow/tool. Not a single-purpose apply agent.
3. **HITL** — risk-gated via `requireApproval: true` on individual tools. The existing approval pattern from the prior spec carries over: tools that need approval pause the stream and surface a `tool-call-approval` chunk; everything else auto-runs.

## Architecture

### Mastra side: add a supervisor agent

The supervisor pattern replaces the deprecated `.network()` primitive. It uses `Agent.stream()` / `Agent.generate()` internally to delegate to sub-agents, workflows, and tools registered on the supervisor's `agents`, `workflows`, and `tools` fields (per [Supervisor agents](https://mastra.ai/docs/agents/supervisor-agents), `@mastra/core@1.8.0+`).

**New file**: `apps/agent/src/mastra/agents/hub-supervisor.ts`

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
      "Coordinates the user's personal hub: resume data, project stacks, weather, and the apply-to-jobs flow.",
    instructions: `You are the coordinator for the user's personal hub.

Available primitives:

Sub-agents (delegate when a user request is best handled by a specialist):
- weatherAgent: answers weather and activity-planning questions. Always delegate weather requests here.
- stackCategorizerAgent: classifies npm packages into tech-stack categories. Use when the user wants to organize or label dependencies.

Workflows (use for multi-step processes):
- detectStacksWorkflow: scans project repositories and detects tech stacks from their package.json files. Use when the user asks to discover or refresh stacks for a project.
- organizeStacksWorkflow: merges, renames, and enriches existing stacks. Use when the user wants to clean up their stack library.
- weatherWorkflow: weather forecast + activity planning. Prefer the weatherAgent for conversational weather; use this workflow for structured forecast output.

Tools (call directly when no sub-agent fits):
- (None for now — apply-to-jobs tools will be added when the applyAgent lands.)

Delegation strategy:
1. Identify the user's intent. If it maps cleanly to one primitive, delegate.
2. If the request is ambiguous, ask the user to clarify before delegating.
3. For multi-step tasks, delegate step by step and synthesize the result.
4. Never invent data. Always delegate to a primitive that produces the truth.

Success criteria:
- The user gets a direct answer to their question, not a description of what you would do.
- Tools marked with requireApproval: true must surface their approval to the user before executing.
- Always prefer delegating over answering from general knowledge when a specialist exists.`,
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
    // No `storage` here. The Mastra instance (`apps/agent/src/mastra/index.ts`)
    // already configures `PostgresStore` once, and the supervisor's `Memory`
    // inherits it. This is the convention from the Mastra memory docs
    // (https://mastra.ai/docs/memory/overview): configure storage on the
    // Mastra instance, then pass `Memory` to agents without re-passing
    // storage. Existing sub-agents inherit this memory automatically
    // because they have no `memory` field of their own.
    memory: new Memory({
      options: { lastMessages: 20 }
    })
  });
}
```

**Updates to existing files** (small, additive):

- `apps/agent/src/mastra/agents/weather-agent.ts` — add a `description` field (required for the supervisor to know when to delegate). No other changes.
- `apps/agent/src/mastra/agents/stack-categorizer-agent.ts` — add a `description` field. No other changes.
- `apps/agent/src/mastra/index.ts` — import `createHubSupervisor` and register it in `agents: { ...hubSupervisor: createHubSupervisor() }`. No `chatRoute` changes needed — the existing `/chat/:agentId` already routes to the new supervisor when called with `agentId: "hub-supervisor"`.

The supervisor gets the same Postgres storage the Mastra instance already configures, so tool-approval snapshots and conversation memory persist across refreshes (per the [Agent approval](https://mastra.ai/docs/agents/agent-approval) docs: "Suspended runs only survive restarts when your Mastra instance is configured with a persistent storage provider").

### oRPC side: protect all chat procedures + add approval endpoints

The existing oRPC `agentRouter` exposes `chat` (non-streaming) and `chatStream` (streaming) as `publicProcedure`. Both are switched to `protectedProcedure` so the auth boundary is consistent at the procedure level — the dashboard route guard is not the only thing protecting these endpoints. This is a small breaking change for any public caller; see §Risks for the playground consequence and the chosen mitigation.

The router also gains three new procedures for the HITL approval flow:

```ts
chat: protectedProcedure /* was publicProcedure */
  .route({ description: "Send a message to the agent and get a non-streaming response", method: "POST" })
  .input(z.object({ agentId: agentIdSchema, messages: messagesSchema }))
  .output(z.object({ content: z.string() }))
  .handler(/* unchanged */),

chatStream: protectedProcedure /* was publicProcedure */
  .route({ description: "Stream a chat response from the agent as an event iterator", method: "POST" })
  .input(z.object({ agentId: agentIdSchema, messages: uiMessagesSchema }))
  .handler(/* unchanged — body still proxies to /chat/:agentId */),

approveToolCall: protectedProcedure
  .input(z.object({
    agentId: z.string().default("hub-supervisor"),
    runId: z.string(),
    toolCallId: z.string().optional()
  }))
  .handler(async ({ input, context }) => {
    const upstream = await context.agentWorker.fetch(
      `/agents/${input.agentId}/approve-tool-call`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: input.runId, toolCallId: input.toolCallId })
      }
    );
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Approve returned ${upstream.status}`);
    }
    return streamToEventIterator(upstream.body);
  }),

declineToolCall: protectedProcedure
  .input(z.object({
    agentId: z.string().default("hub-supervisor"),
    runId: z.string(),
    toolCallId: z.string().optional()
  }))
  .handler(/* mirror of approveToolCall, but calls `/agents/:agentId/decline-tool-call` */),

listSuspendedRuns: protectedProcedure
  .input(z.object({
    agentId: z.string().default("hub-supervisor"),
    threadId: z.string(),
    resourceId: z.string()
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

The exact Mastra server path (`/agents/:agentId/approve-tool-call` etc.) is verified against the installed `@mastra/core@1.50.1` during implementation. The user identity is passed through `context.session.user.id` as the `resourceId`. The `threadId` is a **stable per-user identifier** for the dashboard home (e.g. `dashboard-home:<userId>`) — a single conversation per user, not per page-load. This is what makes refresh-resume work: on page load, `useHubChat` calls `listSuspendedRuns({ threadId, resourceId })` to discover any pending approval and re-render it. A per-tab or per-session thread would lose approvals on refresh.

### Web side: same UI, new wiring

The UI architecture from the prior spec carries over unchanged: shadcn `Message` / `Bubble` / `Message Scroller` (Base UI variants) for the chat surface, prompt-kit for the input and tool/reasoning primitives, coss ui for chrome. What changes is what the widget calls and what the suggestions say.

The new `useHubChat()` hook (in `features/agent-hub/lib/use-hub-chat.ts`) is a thin wrapper over the existing `useAgentChat` pattern (`features/agent/api/agent-chat.ts:86-117`) with the `agentId` pinned to `"hub-supervisor"` and a typed `setMessages` flow that knows how to resume from `tool-call-approval` chunks.

A new `useHubApproval()` hook reads the message stream's `tool-call-approval` chunks, exposes an `approve(toolCallId)` / `decline(toolCallId)` action pair, and on click calls the oRPC `agent.approveToolCall` / `agent.declineToolCall` procedures. The AI SDK v5/v6 native approval flow is used: each approval response is added to the message via `addToolApprovalResponse` on the `useChat` instance, and the transport resumes.

### Why this beats the prior spec

The prior spec assumed a single-purpose `apply` flow with three hardcoded tools and a scripted mock. The new design:

- **Drops the mock entirely** — the chat hits the real supervisor. No `createChat()` scripted conversation. No `scripted-conversation.ts`.
- **Drops the apply-specific tool set** — the supervisor decides which primitives to call. Adding a new tool means changing Mastra, not the chat widget.
- **Drops the apply-specific suggestions** — the suggestions reflect what the hub can do (weather, stacks, apply, etc.).
- **Reuses everything that already works** — the existing `chatRoute`, the existing oRPC `chatStream` proxy, the existing `useAgentChat` transport pattern. The diff is additive.

## File Layout

```
apps/agent/src/mastra/
  agents/
    weather-agent.ts                  # MODIFIED — add `description` field
    stack-categorizer-agent.ts       # MODIFIED — add `description` field
    hub-supervisor.ts                # NEW — the supervisor agent
  index.ts                           # MODIFIED — register hubSupervisor

packages/api/src/routers/
  agent.router.ts                    # MODIFIED — add approveToolCall, declineToolCall, listSuspendedRuns

apps/web/src/
  routes/(root-layout)/__protected/dashboard/index.tsx  # MODIFIED — swap component ref
  routes/(root-layout)/playground/                      # MODIFIED — moved under __protected/
  routes/(root-layout)/__protected/playground/          # NEW location (was public)
    agent/index.tsx
    index.tsx
  pages/dashboard/home/
    ui/dashboard-home-page.tsx       # REPLACED — renders <AgentHubPage>
    ui/agent-hub-page.tsx            # NEW — <ClientOnly> wrapper around <AgentHubChat>
    index.ts                         # re-exports
  widgets/agent-hub/
    index.ts                         # NEW
    ui/agent-hub-chat.tsx            # NEW — chat root, owns useHubChat, renders message list
    ui/agent-hub-empty-state.tsx     # NEW — greeting + PromptSuggestion row
    ui/agent-hub-message-row.tsx     # NEW — wraps shadcn <Message>
    ui/agent-hub-message-parts.tsx   # NEW — switch on part type
    ui/agent-hub-tool-card.tsx       # NEW — wraps prompt-kit <Tool>
    ui/agent-hub-tool-approval.tsx   # NEW — HITL card, rendered when a tool-call-approval chunk arrives
    ui/agent-hub-prompt-composer.tsx # NEW — wraps prompt-kit <PromptInput>
    ui/agent-hub-typing-indicator.tsx# NEW
  features/agent-hub/
    index.ts                         # NEW
    lib/
      use-hub-chat.ts                # NEW — useChat wrapper pinned to hub-supervisor
      use-hub-approval.ts            # NEW — approve/decline actions over the stream
      hub-suggestions.ts             # NEW — 4 prompt-suggestion strings + icons
      hub-approval.ts                # NEW — addToolApprovalResponse helper
    types.ts                         # NEW
  components/prompt-kit/             # NEW — prompt-kit install target (carries over from prior spec)
    prompt-input.tsx, prompt-suggestion.tsx, loader.tsx, markdown.tsx,
    code-block.tsx, tool.tsx, reasoning.tsx, chain-of-thought.tsx
  components/ui/                     # EXTENDED — shadcn Base UI add targets
    message.tsx, bubble.tsx, message-scroller.tsx, marker.tsx
```

`apps/web/src/features/agent/` (the agent playground at `/playground/agent`) is untouched.

## Data Flow

1. User loads the dashboard home. Empty state renders 4 prompt suggestions.
2. User clicks a suggestion (or types their own). The prompt is sent via `useHubChat().sendMessage(...)`.
3. `useHubChat` uses the existing `orpcClient.agent.chatStream` proxy (`packages/api/src/routers/agent.router.ts:209`) which forwards to `POST /chat/hub-supervisor` on the agent worker.
4. The Mastra `chatRoute` handler runs the supervisor via `agent.stream()` with `requireApproval` set per-tool (the supervisor forwards sub-agent approval requests to the top level).
5. The response is an AI SDK v5 `UIMessageStream` SSE stream, which the oRPC handler converts to an event iterator. The client wraps it back into a `ReadableStream<UIMessageChunk>` that `useChat` consumes.
6. As chunks arrive:
   - `text-delta` → renders into the assistant message bubble
   - `reasoning-delta` → renders into the reasoning block
   - `tool-input-available` / `tool-output-available` → renders into the tool card
   - `tool-call-approval` → renders into the HITL approval card and pauses the input
7. On approve, `useHubApproval().approve(toolCallId)` calls `orpcClient.agent.approveToolCall({ agentId, runId, toolCallId })`. The oRPC route POSTs to `/agents/hub-supervisor/approve-tool-call` on the agent worker, which returns a resumed stream. The oRPC event iterator forwards the resume chunks back through the same `useChat` transport.

The supervisor's `runId` is captured from the first `messageMetadata` chunk and threaded through the approval action.

## Component Composition

```
<AgentHubPage>                       # pages/dashboard/home/ui/agent-hub-page.tsx
  <ClientOnly>                       # SSR guard — useChat needs the browser
    <AgentHubChat>                   # widgets/agent-hub/ui/agent-hub-chat.tsx
      <AgentHubEmptyState />         # shown only when messages.length === 0
      <MessageScroller>              # shadcn (Base UI), auto-scroll
        <AgentHubMessageRow>         # per message
          <AgentHubMessageParts>     # switch on part type
            text → <MessageContent><Bubble><Markdown /></Bubble></MessageContent>
            reasoning → <Reasoning> (prompt-kit)
            tool → <AgentHubToolCard>
              tool-call-approval state → <AgentHubToolApproval>
      <AgentHubPromptComposer>       # docked bottom, prompt-kit PromptInput
        <AgentHubTypingIndicator />  # shown when status === "submitted" | "streaming"
      </AgentHubChat>
```

`AgentHubToolApproval` reads the pending `tool-call-approval` payload from the message and renders three actions:

- `Approve` (primary coss Button) → calls `useHubApproval().approve(toolCallId)`
- `Decline` (destructive outline coss Button) → calls `useHubApproval().decline(toolCallId)`
- A disabled "Approval required to continue" notice pinned to the input composer

The approval card surfaces the `toolName` and `args` (the `toolName` is what tells the user "this is the apply tool" vs "this is a stack scan"). The card is generic — it works for any future `requireApproval: true` tool added to any sub-agent.

## Visual Design

- **Empty state**: centered, vertically padded. H1 greeting ("Welcome back. What can I do for you?") + 1-line sub. Below: 2×2 grid of `<PromptSuggestion>` chips. The four suggestions are:
  1. "What's the weather in Berlin?"
  2. "Detect stacks for my project"
  3. "Help me apply to a job" ← establishes the apply flow without making it the only flow
  4. "Clean up my stack library"
- **First message onwards**: standard chat layout, input docked bottom, messages fill the scroller.
- **Message rows**: user messages right-aligned with `Bubble` variant `default` (primary), assistant messages left-aligned with `Bubble` variant `ghost` (unframed) so markdown can span full width.
- **Avatars**: small circular, "You" uses coss `Avatar` with neutral fallback (initials), "Agent" uses coss `Avatar` with a Lucide `Sparkles` icon fallback.
- **Tool card**: collapsible. Header shows tool name + status pill (coss `Badge`: spinner while running, `Check` when done, `X` when denied, `AlertTriangle` on error). Body shows `args` and output rendered via `Markdown`.
- **HITL approval card**: nested inside the tool card. Shows the tool name, the args the model chose, and a "Why this needs your approval" line. Two actions in a horizontal button group on the right: `Approve` (primary), `Decline` (destructive outline). The input composer shows a sticky "Approval required to continue" notice.
- **Reasoning**: prompt-kit `Reasoning` component, collapsed by default.
- **Loader**: prompt-kit `Loader` variant `typing` for "Agent is typing" indicator.
- **Mobile**: empty-state suggestions stack vertically; approval card buttons wrap; sheet opens full-width.

## FSD Boundaries

- **Routes** (`apps/web/src/routes/`): swap the component reference in the existing `dashboard/index.tsx` to the new `AgentHubPage`. Drop the `experiences.list` and `projects.list` prefetches in `beforeLoad` since the new page doesn't render resume stats. Keep the auth guard intact.
- **Pages** (`apps/web/src/pages/dashboard/home/`): the page is a thin `<ClientOnly>` wrapper around `<AgentHubChat />`.
- **Widgets** (`apps/web/src/widgets/agent-hub/`): presentational composition. Knows about the supervisor's UI (renders the approval card) but not the data shape internals beyond `UIMessage`.
- **Features** (`apps/web/src/features/agent-hub/`): all client-side chat wiring. This is the only slice that touches the streaming / approval APIs.
- **Shared** (`apps/web/src/shared/ui/`): no changes.
- **`packages/ui`**: no changes. No new shared components.
- **`packages/api`**: `agentRouter` grows three new procedures.
- **`apps/agent`**: one new agent, two trivial additions to existing agents, one new registration line.

## Validation

Per `.agents/workflow.md`:

1. `pnpm lint` — must pass clean.
2. `pnpm typecheck` — must pass clean. Watch for AI SDK v5 type identity mismatches (the existing `useAgentChat` already documents one in `features/agent/api/agent-chat.ts:97-110` — apply the same cast pattern if it reappears here). The Mastra `approveToolCall` / `declineToolCall` return types must be verified against the installed `@mastra/core@1.50.1` API.
3. `pnpm dev` (web) + `pnpm dev` (agent) — verify:
   - Empty state shows 4 suggestions and the greeting.
   - Clicking suggestion 1 (weather) routes to the weatherAgent and returns a forecast.
   - Clicking suggestion 2 (detect stacks) routes to the detectStacksWorkflow and streams progress events.
   - Clicking suggestion 3 (apply) currently has no matching tool — the supervisor should respond with a friendly "I don't have an apply tool yet" message, or future work wires an `applyAgent` sub-agent. **Spec assumes option (a) for this iteration**: suggestion 3 returns a clear "the apply flow is on the roadmap" message, since no applyAgent exists yet.
   - Any sub-agent tool marked with `requireApproval: true` triggers the approval card. (In this iteration, the existing `weatherTool` does not have `requireApproval: true`; the approval flow is verified manually by adding `requireApproval: true` to a temporary tool or by setting `requireToolApproval: true` on the `stream()` call during a test.)
   - Refresh preserves the chat thread (memory is configured on the supervisor) and re-surfaces any pending approval via `listSuspendedRuns`.
4. Keyboard: `Tab` order is sensible; `Enter` submits; `Esc` does not close the approval card (intentional — forcing a decision).
5. Mobile breakpoint check at 375px width.

No tests are added (project convention: tests only when explicitly requested).

## Risks & Open Questions

- **Mastra server API paths**: the exact HTTP paths for `approveToolCall`, `declineToolCall`, and `listSuspendedRuns` are verified against the installed `@mastra/core@1.50.1` during implementation. The spec assumes `/agents/:agentId/approve-tool-call` and `/agents/:agentId/suspended-runs` per the Agent approval docs; the implementation will adjust if the installed version differs.
- **`chat` and `chatStream` becoming `protectedProcedure` breaks the playground**: the existing `/playground/agent` route is currently a public route (lives under `(root-layout)/playground/agent/`, not under `(root-layout)/__protected/`). When `chatStream` becomes protected, the playground's `useAgentChat` will fail with an auth error. **Mitigation**: move `(root-layout)/playground/agent/` and `(root-layout)/playground/` under `__protected/` (the simplest fix — the playground is a dev tool, behind auth is fine). Alternative is to keep `chatStream` public and add a separate `protectedChatStream` for the dashboard, but that re-introduces the inconsistency we just removed.
- **shadcn Base UI variants in `base-maia` style**: same risk as the prior spec — shadcn's Base UI components are typically styled for the default shadcn theme. Confirmed during implementation; fallback is app-local style overrides.
- **AI SDK v5/v6 cross-version `UIMessage` type identity**: `@mastra/ai-sdk` (server) and `@ai-sdk/react` (client) each pin their own version of the `ai` package in this workspace. Each version exports a `UIMessage` type. The two types are structurally identical but TypeScript treats them as different named types because they come from different module instances. The existing `useAgentChat` already hits this and works around it with two `as never` / `as unknown` casts (`apps/web/src/features/agent/api/agent-chat.ts:96-110`); the new `useHubChat` will follow the same pattern. The casts are safe at runtime — they only suppress a TypeScript type-identity complaint.
- **prompt-kit + shadcn Base UI coexistence**: prompt-kit was originally built for shadcn/Radix. It may pull `radix-ui` transitively. `packages/ui` already lists `radix-ui` as a catalog dependency for legacy reasons. We do not block on this.
- **Apply flow is aspirational**: the user wants the apply flow established, but no `applyAgent` sub-agent exists yet. The chat will work for the existing primitives (weather, stack categorization, detect/organize stacks workflows). Suggestion 3 ("Help me apply to a job") is wired to the supervisor, which will respond with a roadmap-style message until the apply agent is built in a follow-up. This is acceptable scope and explicitly called out in the suggestion copy ("on the roadmap").
- **Snapshots + storage**: approval resume after refresh requires snapshots. PostgresStore is already configured on the Mastra instance; the supervisor's `Memory` inherits it per the [Mastra memory docs](https://mastra.ai/docs/memory/overview). No extra setup. The implementation will verify that snapshots are created and resumed correctly.

## Out of Scope (YAGNI)

- Building the `applyAgent` and its tools (`search_jobs`, `tailor_resume`, `submit_application`). The chat widget is ready for them when they ship — they just register on the supervisor.
- Voice input, file upload, image attachments.
- Multi-conversation sidebar.
- Per-thread history browser.
- i18n keys.
- Tests (project default).

## Implementation Order

1. **Mastra side**: add `description` to `weatherAgent` and `stackCategorizerAgent`. Add `apps/agent/src/mastra/agents/hub-supervisor.ts`. Register it in `index.ts`. Verify `pnpm dev` (agent) boots and `POST /chat/hub-supervisor` returns a stream.
2. **oRPC side**: change `chat` and `chatStream` from `publicProcedure` to `protectedProcedure`; add `approveToolCall`, `declineToolCall`, `listSuspendedRuns` to `agentRouter`. Move the playground route under `__protected/` so the auth change doesn't break it. Verify by curling each endpoint via the agent worker while signed in.
3. **Install web deps**: `@shadcn/helpers`; shadcn Base UI `message` / `bubble` / `message-scroller` / `marker` via `pnpm ui add`; prompt-kit primitives via the prompt-kit registry.
4. **Web slice**: build `features/agent-hub/lib/` bottom-up (`use-hub-chat.ts` → `use-hub-approval.ts` → `hub-approval.ts` → `hub-suggestions.ts`).
5. **Web widgets**: build `widgets/agent-hub/ui/` bottom-up (`agent-hub-message-parts.tsx` → `agent-hub-tool-card.tsx` → `agent-hub-tool-approval.tsx` → `agent-hub-message-row.tsx` → `agent-hub-prompt-composer.tsx` → `agent-hub-typing-indicator.tsx` → `agent-hub-empty-state.tsx` → `agent-hub-chat.tsx`).
6. **Wire route**: create `pages/dashboard/home/ui/agent-hub-page.tsx`, swap the route's component reference, delete the old `dashboard-home-page.tsx` resume-overview code (file is rewritten).
7. **Manual verification**: per the §Validation section, exercise all four suggestions and the approval flow.
