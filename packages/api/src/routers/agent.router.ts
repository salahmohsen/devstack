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
      if (!context.agentWorker) {
        throw new Error("agentWorker not configured");
      }

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
   * AI SDK UIMessage chunks.
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
      if (!context.agentWorker) {
        throw new Error("agentWorker not configured");
      }

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
