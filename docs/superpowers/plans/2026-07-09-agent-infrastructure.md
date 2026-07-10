# Agent Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Build the infrastructure for the web app to consume the Mastra agent Worker through the server's auth-aware oRPC pipeline, with AI SDK streaming for chat.

**Architecture:** Web → `orpcQueryClient` → Server (Hono + oRPC + Auth) → Service Binding (prod) or env URL (dev) → Agent Worker. The `agentWorker` is added to `OrpcContext` so every procedure handler can call the agent. The chat procedure forwards the upstream streaming response as an oRPC event iterator; the client uses `useChat` + `eventIteratorToUnproxiedDataStream` from the AI SDK integration. Auth is handled by oRPC middleware (`publicProcedure` / `protectedProcedure`).

**Tech Stack:** `apps/web` (TanStack Start + AI SDK UI), `apps/server` (Hono + oRPC), `apps/agent` (Mastra on Cloudflare Workers), `packages/core`, `packages/api`, `packages/env`, plus new deps: `ai`, `@ai-sdk/react`.

---

## Type & Path Notes

- **Mastra route paths** (verified against installed `@mastra/server@1.50.1` at `node_modules/.pnpm/@mastra+server@1.50.1_.../dist/server/handlers/agents.d.ts`):
  - Non-streaming generate: `POST /agents/:agentId/generate` (NO `/api` prefix)
  - **AI SDK UIMessage stream: `POST /agents/:agentId/stream/ui`** (this is what `useChat` consumes — NOT `/stream`, which returns Mastra's own chunk format)
  - Other stream variants: `/stream` (Mastra chunks), `/stream/vnext` (Mastra vnext chunks), `/stream/vnext/ui` (UIMessage vnext)
- **Import alias conventions** (verified by grep over `apps/web/src/**/*.{ts,tsx}`):
  - `apps/web` uses `@/...` for internal imports (e.g. `@/shared/...`, `@/features/...`, `@/pages/...`)
  - `packages/api` uses `#@/...` for internal imports
  - Cross-package imports use `@tsu-stack/<pkg>/...`
- **Page component pattern**: `apps/web/src/pages/<feature>/index.ts` is a barrel re-exporting `* from "./ui/<feature>-page"`. Route files import from the barrel.
- **Cloudflare `Fetcher.fetch` signature**: accepts `Request | string` (not `URL`).
- **`@mastra/client-js` is NOT installed** in the repo. We use raw `fetch` against the agent's HTTP endpoints.
- **`ai` and `@ai-sdk/react` are NOT installed**. Both must be added.
- **`@orpc/ai-sdk` is NOT installed and NOT needed** — `streamToEventIterator` and `eventIteratorToUnproxiedDataStream` are exported by `@orpc/server` / `@orpc/client` (re-exported from `@orpc/shared`). The `@orpc/ai-sdk` package is for `implementTool` / `createTool` server helpers, which this plan does not use.
- **Streaming pipe approach**: oRPC's `streamToEventIterator(stream: ReadableStream<T>): AsyncIteratorClass<T>` (verified in `@orpc/shared@1.14.6` d.ts) takes a `ReadableStream`. The agent's HTTP response body is itself a `ReadableStream<Uint8Array>`. So the server handler can do `return streamToEventIterator(upstream.body)` to pipe the bytes through unchanged. The client uses `eventIteratorToUnproxiedDataStream(iterator)` to get back a `ReadableStream<Uint8Array>` that `useChat` consumes directly.
- **Why `/stream/ui` not `/stream`**: The `/stream` endpoint returns Mastra's own chunk types (`agent-execution-start`, `text`, `tool-call`, etc.). `useChat` expects AI SDK's `UIMessageChunk` format (`text-start`, `text-delta`, `step-start`, `finish-step`, etc.). The `/stream/ui` endpoint (and `/stream/vnext/ui`) is Mastra's built-in bridge to the AI SDK format — it returns SSE-encoded `UIMessageChunk` events directly. Using `/stream/ui` means we can pipe bytes through without any format conversion in our code.

---

## File Map

| Action | File                                                           | Reason                                                          |
| ------ | -------------------------------------------------------------- | --------------------------------------------------------------- |
| Modify | `packages/core/src/orpc-context/index.ts`                      | Add `OrpcContextAgentWorker` type + field                       |
| Modify | `packages/api/src/lib/context/types.ts`                        | Re-export `OrpcContextAgentWorker`                              |
| Create | `packages/api/src/lib/agent/worker.ts`                         | Shared `createAgentWorker()` factory                            |
| Modify | `packages/api/src/lib/context/hono/create-context.ts`          | Construct `agentWorker` from binding or URL                     |
| Modify | `packages/api/src/client/tanstack-start/orpc.ts`               | Construct `agentWorker` in SSR context                          |
| Create | `packages/api/src/routers/agent.router.ts`                     | oRPC procedures (`chat` + `chatStream`)                         |
| Modify | `packages/api/src/routers/index.ts`                            | Register `agentRouter` in `appRouter`                           |
| Modify | `pnpm-workspace.yaml`                                          | Add `ai`, `@ai-sdk/react` to catalog                            |
| Modify | `packages/api/package.json`                                    | No new deps needed (oRPC exports are already present)           |
| Modify | `apps/web/package.json`                                        | Add `ai`, `@ai-sdk/react` dependencies                          |
| Modify | `packages/env/src/server/env.ts`                               | Add `AGENT_WORKER_URL` env var                                  |
| Modify | `packages/env/.env.example`                                    | Document `AGENT_WORKER_URL`                                     |
| Modify | `apps/server/worker-configuration.d.ts`                        | Add `AGENT_WORKER: Fetcher` binding type                        |
| Modify | `apps/server/wrangler.jsonc`                                   | Add `services[]` binding + `AGENT_WORKER_URL` var               |
| Modify | `apps/server/wrangler.dev.jsonc`                               | Same as above for dev                                           |
| Create | `apps/web/src/features/agent/api/agent-chat.client.ts`         | `useChat` transport (oRPC + eventIteratorToUnproxiedDataStream) |
| Create | `apps/web/src/pages/agent/ui/agent-chat-page.tsx`              | Chat UI component using `useChat`                               |
| Create | `apps/web/src/pages/agent/index.ts`                            | Barrel re-export                                                |
| Create | `apps/web/src/routes/(root-layout)/playground/agent/index.tsx` | Route file                                                      |

---

### Task 1: Add `agentWorker` to OrpcContext

**Files:**

- Modify: `packages/core/src/orpc-context/index.ts:81-91`
- Modify: `packages/api/src/lib/context/types.ts`

- [ ] **Step 1: Add `OrpcContextAgentWorker` type to core**

Edit `packages/core/src/orpc-context/index.ts`. Add this type after `OrpcContextMediaBucket` and before `OrpcContext`:

```typescript
// Cloudflare Fetcher.fetch accepts Request | string, not URL.
// Using RequestInfo (Request | string) keeps the type compatible.
export type OrpcContextAgentWorker = {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
};
```

Add `agentWorker: OrpcContextAgentWorker;` as a new field to the `OrpcContext` type.

- [ ] **Step 2: Re-export from api context types**

Edit `packages/api/src/lib/context/types.ts`:

```typescript
export type {
  OrpcContext,
  OrpcContextAgentWorker,
  OrpcContextLogger,
  OrpcContextMediaBucket
} from "@tsu-stack/core";
```

- [ ] **Step 3: Verify types build**

Run: `pnpm -F @tsu-stack/core typecheck && pnpm -F @tsu-stack/api typecheck`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add packages/core/ packages/api/
git commit -m "feat(core): add agentWorker field to OrpcContext"
```

---

### Task 2: Create shared `createAgentWorker` factory

**Files:**

- Create: `packages/api/src/lib/agent/worker.ts`

- [ ] **Step 1: Create the factory**

```typescript
import { type OrpcContextAgentWorker } from "#@/lib/context/types";

export type AgentWorkerEnv = {
  AGENT_WORKER?: Fetcher;
  AGENT_WORKER_URL?: string;
};

export function createAgentWorker(env: AgentWorkerEnv): OrpcContextAgentWorker {
  return {
    fetch(input, init) {
      const binding = env.AGENT_WORKER;
      if (binding) {
        // Fetcher.fetch(Request | string, RequestInit)
        return binding.fetch(input as Request | string, init);
      }
      const baseUrl = env.AGENT_WORKER_URL;
      if (!baseUrl) {
        throw new Error(
          "Agent worker is not configured. Set AGENT_WORKER_URL or add a service binding."
        );
      }
      const request = new Request(input, init);
      const url = new URL(request.url, baseUrl.replace(/\/+$/, ""));
      return fetch(url.href, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        // Required when forwarding a streaming body to fetch()
        // @ts-expect-error - duplex is non-standard but supported in Node 18+ and Workers
        duplex: "half"
      });
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/lib/agent/
git commit -m "feat(api): createAgentWorker factory for Hono and SSR contexts"
```

---

### Task 3: Add `AGENT_WORKER_URL` env var

**Files:**

- Modify: `packages/env/src/server/env.ts`
- Modify: `packages/env/.env.example`

- [ ] **Step 1: Add env var schema**

Edit `packages/env/src/server/env.ts`. Add after `EMBEDDING_MODEL`:

```typescript
// Agent Worker URL — used as a fallback in dev when no Cloudflare service
// binding is available. In production, prefer the AGENT_WORKER service
// binding (which `createAgentWorker` checks first).
AGENT_WORKER_URL: z.string().url().optional(),
```

- [ ] **Step 2: Update `.env.example`**

Add to `packages/env/.env.example`:

```env
# Agent Worker URL — dev fallback when service binding is unavailable
AGENT_WORKER_URL="http://localhost:4111"
```

- [ ] **Step 3: Commit**

```bash
git add packages/env/
git commit -m "feat(env): add AGENT_WORKER_URL env var"
```

---

### Task 4: Wire service binding in server wrangler config

**Files:**

- Modify: `apps/server/wrangler.jsonc`
- Modify: `apps/server/wrangler.dev.jsonc`
- Modify: `apps/server/worker-configuration.d.ts`

- [ ] **Step 1: Add `services` binding and env var to production wrangler config**

Edit `apps/server/wrangler.jsonc`:

1. Add inside `vars`:

   ```jsonc
   "AGENT_WORKER_URL": "http://localhost:4111"
   ```

2. Add at the top level (alongside `kv_namespaces`, `r2_buckets`, etc.):

   ```jsonc
   "services": [{ "binding": "AGENT_WORKER", "service": "devhub-agent" }]
   ```

- [ ] **Step 2: Same for dev wrangler config**

Edit `apps/server/wrangler.dev.jsonc` — add the same two changes.

- [ ] **Step 3: Add binding type**

Edit `apps/server/worker-configuration.d.ts`. Add to `__BaseEnv_Env`:

```typescript
AGENT_WORKER: Fetcher;
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/
git commit -m "feat(server): add AGENT_WORKER service binding and AGENT_WORKER_URL env var"
```

---

### Task 5: Wire `agentWorker` into Hono context builder

**Files:**

- Modify: `packages/api/src/lib/context/hono/create-context.ts`

- [ ] **Step 1: Import and use createAgentWorker**

Edit `packages/api/src/lib/context/hono/create-context.ts`:

1. Add import after the existing `import { type OrpcContext } from "#@/lib/context/types";`:

   ```typescript
   import { createAgentWorker, type AgentWorkerEnv } from "#@/lib/agent/worker";
   ```

2. Add to `HonoBindings` type:

   ```typescript
   type HonoBindings = {
     GITHUB_CACHE_KV?: GitHubRuntimeBindings["kv"];
     GITHUB_SIGNAL_RELAY?: GitHubRuntimeBindings["signalRelay"];
     MEDIA_BUCKET?: unknown;
     AGENT_WORKER?: Fetcher;
     AGENT_WORKER_URL?: string;
   };
   ```

3. After the `mediaBucket` check (around line 39, after the throw), add:

   ```typescript
   const agentWorker = createAgentWorker(context.env as AgentWorkerEnv);
   ```

4. Add `agentWorker` to the returned object (alongside `mediaBucket`).

- [ ] **Step 2: Verify types build**

Run: `pnpm -F @tsu-stack/api typecheck`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/lib/context/hono/
git commit -m "feat(api): wire agentWorker into Hono context builder"
```

---

### Task 6: Wire `agentWorker` into SSR context builder

**Files:**

- Modify: `packages/api/src/client/tanstack-start/orpc.ts`

- [ ] **Step 1: Import and use createAgentWorker**

Edit `packages/api/src/client/tanstack-start/orpc.ts`:

1. Add import:

   ```typescript
   import { createAgentWorker, type AgentWorkerEnv } from "#@/lib/agent/worker";
   ```

2. Inside the `runWithDb(createDb(), async () => { ... })` block, before the `return { ... }`, add:

   ```typescript
   // The web Worker has no service binding to the agent. The factory will
   // fall back to `AGENT_WORKER_URL` if set; if neither is configured we
   // attach a stub that throws lazily on `.fetch()`. This keeps SSR
   // startup working even when the env var is missing in deployment —
   // the throw only happens if an agent procedure is actually called
   // from SSR, which is not the normal path.
   const envAny = env as AgentWorkerEnv;
   const agentWorker =
     (envAny.AGENT_WORKER ?? envAny.AGENT_WORKER_URL)
       ? createAgentWorker(envAny)
       : {
           fetch(): Promise<Response> {
             throw new Error(
               "Agent worker is not configured. Set AGENT_WORKER_URL or add a service binding."
             );
           }
         };
   ```

3. Add `agentWorker` to the return object.

- [ ] **Step 2: Verify types build**

Run: `pnpm -F @tsu-stack/api typecheck`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/client/
git commit -m "feat(api): wire agentWorker into SSR context builder"
```

---

### Task 7: Add AI SDK dependencies

**Files:**

- Modify: `pnpm-workspace.yaml`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add catalog entries to `pnpm-workspace.yaml`**

Read the file first to find the existing catalog structure. Add alongside the existing `@orpc/*` entries:

```yaml
# Mastra's peerDep requires ai >= 5.0.76
ai: ^5.0.76
"@ai-sdk/react": ^5.0.0
```

- [ ] **Step 2: Add dependencies to `apps/web/package.json`**

Add to `dependencies`:

```json
"ai": "catalog:",
"@ai-sdk/react": "catalog:"
```

- [ ] **Step 3: Install**

Run: `pnpm install`
Expected: installs the new packages and updates `pnpm-lock.yaml`

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml apps/web/package.json
git commit -m "feat(deps): add ai and @ai-sdk/react to workspace catalog"
```

---

### Task 8: Create agent oRPC router

**Files:**

- Create: `packages/api/src/routers/agent.router.ts`
- Modify: `packages/api/src/routers/index.ts`

- [ ] **Step 1: Create the router**

```typescript
import { streamToEventIterator } from "@orpc/server";
import { z } from "zod";

import { publicProcedure } from "#@/lib/procedures/factory";

const agentIdSchema = z.string().default("weather-agent");

const messagesSchema = z.array(
  z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string()
  })
);

// AI SDK UIMessage[] — typed as `z.array(z.any())` to avoid leaking
// AI SDK types into the input contract. The client passes whatever
// `useChat` gives it.
const uiMessagesSchema = z.array(z.any());

export const agentRouter = {
  /**
   * Non-streaming chat. Returns the full response once it's ready.
   * Useful for non-UI callers (cron jobs, form enhance, one-shot tooling).
   *
   * The `text` field is populated for plain-text agent output. If a
   * future agent uses structured output, `text` may be empty — fall
   * back to `object` stringified as a safety net.
   */
  chat: publicProcedure
    .route({
      description: "Send a message to the agent and get a non-streaming response",
      method: "POST"
    })
    .input(
      z.object({
        agentId: agentIdSchema,
        messages: messagesSchema
      })
    )
    .output(z.object({ content: z.string() }))
    .handler(async ({ input, context }) => {
      const response = await context.agentWorker.fetch(`/agents/${input.agentId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: input.messages })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Agent returned ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        text?: string;
        object?: unknown;
      };
      return {
        content: data.text ?? (data.object != null ? JSON.stringify(data.object) : "")
      };
    }),

  /**
   * Streaming chat. Hits the agent's `/agents/:agentId/stream/ui`
   * endpoint (Mastra's built-in AI SDK UIMessage stream bridge) and
   * pipes the response body through oRPC's EventIterator protocol
   * using `streamToEventIterator`. The client's
   * `eventIteratorToUnproxiedDataStream` converts it back to a
   * `ReadableStream<UIMessageChunk>` that `useChat` consumes.
   *
   * We use `/stream/ui` (not `/stream`) because `/stream` returns
   * Mastra's own chunk format while `/stream/ui` returns SSE-encoded
   * AI SDK UIMessage chunks. See Type & Path Notes.
   */
  chatStream: publicProcedure
    .route({
      description: "Stream a chat response from the agent as an event iterator",
      method: "POST"
    })
    .input(
      z.object({
        agentId: agentIdSchema,
        messages: uiMessagesSchema
      })
    )
    .handler(async ({ input, context }) => {
      const upstream = await context.agentWorker.fetch(`/agents/${input.agentId}/stream/ui`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: input.messages })
      });

      if (!upstream.ok || !upstream.body) {
        const body = await upstream.text();
        throw new Error(`Agent stream returned ${upstream.status}: ${body}`);
      }

      // streamToEventIterator takes a ReadableStream<Uint8Array> and
      // returns an AsyncIteratorClass — oRPC's EventIterator shape.
      return streamToEventIterator(upstream.body);
    })
};
```

- [ ] **Step 2: Register in router index**

Edit `packages/api/src/routers/index.ts`:

1. Add import: `import { agentRouter } from "#@/routers/agent.router";`
2. Add `agent: agentRouter` to `appRouter` object.

- [ ] **Step 3: Verify types build**

Run: `pnpm -F @tsu-stack/api typecheck`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/agent.router.ts packages/api/src/routers/index.ts
git commit -m "feat(api): add agent router with non-streaming chat and streaming chatStream"
```

---

### Task 9: Create web app chat transport and UI

**Files:**

- Create: `apps/web/src/features/agent/api/agent-chat.client.ts`
- Create: `apps/web/src/pages/agent/ui/agent-chat-page.tsx`
- Create: `apps/web/src/pages/agent/index.ts`

- [ ] **Step 1: Configure the `useChat` transport**

Create `apps/web/src/features/agent/api/agent-chat.client.ts`:

```typescript
import { useChat } from "@ai-sdk/react";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const DEFAULT_AGENT_ID = "weather-agent";

/**
 * `useChat` transport that proxies through the oRPC `agent.chatStream`
 * procedure. The server forwards the streaming request to the agent
 * Worker (via service binding in prod, env URL in dev) and re-emits the
 * chunks as an oRPC event iterator. The client converts that iterator
 * back into a `UIMessageStream` for `useChat` via
 * `eventIteratorToUnproxiedDataStream`.
 *
 * `reconnectToStream` is intentionally unsupported per the oRPC + AI
 * SDK integration docs — most chat UIs don't need it.
 */
export function useAgentChat() {
  return useChat({
    transport: {
      async sendMessages(options) {
        return eventIteratorToUnproxiedDataStream(
          await orpcClient.agent.chatStream(
            {
              agentId: DEFAULT_AGENT_ID,
              messages: options.messages
            },
            { signal: options.abortSignal }
          )
        );
      },
      reconnectToStream() {
        throw new Error("Stream reconnection is not supported.");
      }
    }
  });
}
```

- [ ] **Step 2: Create the chat page component**

Create `apps/web/src/pages/agent/ui/agent-chat-page.tsx`:

```typescript
"use client";

import { useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Container } from "@/shared/ui/container";

import { useAgentChat } from "@/features/agent/api/agent-chat.client";

export function AgentChatPage() {
  const { messages, sendMessage, status } = useAgentChat();
  const [input, setInput] = useState("");

  return (
    <Container>
      <h1 className="mb-4 text-2xl">Agent Playground</h1>

      <div className="mb-4 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg p-3 ${
              message.role === "user" ? "bg-muted" : "bg-card"
            }`}
          >
            <strong>{message.role === "user" ? "You" : "Agent"}: </strong>
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <span key={index}>{part.text}</span>
              ) : null
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && status === "ready") {
            sendMessage({ text: input });
            setInput("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Ask the agent..."
          className="flex-1 rounded border px-3 py-2"
        />
        <Button type="submit" disabled={status !== "ready"}>
          {status === "ready" ? "Send" : "Thinking..."}
        </Button>
      </form>
    </Container>
  );
}
```

- [ ] **Step 3: Create the barrel**

Create `apps/web/src/pages/agent/index.ts`:

```typescript
export { AgentChatPage } from "./ui/agent-chat-page";
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/agent/ apps/web/src/pages/agent/
git commit -m "feat(web): add agent chat transport and playground page"
```

---

### Task 10: Add the route file

**Files:**

- Create: `apps/web/src/routes/(root-layout)/playground/agent/index.tsx`

- [ ] **Step 1: Create the route**

```typescript
import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { AgentChatPage } from "@/pages/agent";

export const Route = createFileRoute("/(root-layout)/playground/agent/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/playground/agent"
      },
      description: "Internal playground for testing the Mastra agent chat integration.",
      robots: {
        follow: false,
        index: false
      },
      title: "Agent Playground"
    }),
  component: AgentChatPage
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/\(root-layout\)/playground/agent/
git commit -m "feat(web): add /playground/agent route serving the agent chat page"
```

---

### Task 11: End-to-end verification

- [ ] **Step 1: Start the agent worker**

```bash
cd apps/agent && pnpm run dev
```

Expected: agent worker starts on `http://localhost:4111`

- [ ] **Step 2: Start the server**

```bash
cd apps/server && pnpm run dev
```

Expected: server starts and connects to agent via `AGENT_WORKER_URL` (no service binding in dev)

- [ ] **Step 3: Start the web app**

```bash
cd apps/web && pnpm run dev
```

- [ ] **Step 4: Test the streaming pipeline**

Open `http://localhost:3000/playground/agent` in the browser, type a message, click send. Expected: agent response streams in token-by-token (not all at once). If it does not stream, check the browser network tab for the request to `/rpc` — it should be a long-lived response with `Transfer-Encoding: chunked` or SSE headers.

- [ ] **Step 5: Test the non-streaming path**

Temporarily call `orpcClient.agent.chat({ agentId: "weather-agent", messages: [{ role: "user", content: "..." }] })` from a browser console (or add a temporary button to the playground page). Expected: returns `{ content: "..." }` with the full response. Remove the test button after verification.
