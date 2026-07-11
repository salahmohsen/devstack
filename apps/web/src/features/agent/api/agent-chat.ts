import { useChat } from "@ai-sdk/react";

import {
  eventIteratorToUnproxiedDataStream,
  orpcClient
} from "@tsu-stack/api/client/tanstack-start/orpc";

export const DEFAULT_AGENT_ID = "weather-agent";

/**
 * Parses the server-emitted SSE stream (one `data: <json>\n\n` record
 * per `UIMessageChunk`) into a `ReadableStream<UIMessageChunk>`. The
 * AI SDK's `toUIMessageStreamResponse` uses `JsonToSseTransformStream`
 * on the server, so the response body is text/SSE — not chunk objects.
 */
function sseToUIMessageStream(
  raw: ReadableStream<Uint8Array>
): ReadableStream<Record<string, unknown>> {
  const decoder = new TextDecoder();

  let buffer = "";

  const transform = new TransformStream<Uint8Array, Record<string, unknown>>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      // SSE events are separated by a blank line.
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;
        // Multi-line data: concatenate.
        const dataLines: string[] = [];
        for (const l of line.split("\n")) {
          if (l.startsWith("data:")) {
            dataLines.push(l.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) continue;
        const payload = dataLines.join("\n");
        if (payload === "[DONE]") continue;
        try {
          controller.enqueue(JSON.parse(payload) as Record<string, unknown>);
        } catch {
          // Drop malformed frames silently — matches AI SDK v5 behavior.
        }
      }
    },
    flush(controller) {
      // Flush any trailing buffered data (no trailing blank line).
      const tail = buffer.trim();
      if (tail) {
        const dataLines: string[] = [];
        for (const l of tail.split("\n")) {
          if (l.startsWith("data:")) {
            dataLines.push(l.slice(5).trimStart());
          }
        }
        const payload = dataLines.join("\n");
        if (payload && payload !== "[DONE]") {
          try {
            controller.enqueue(JSON.parse(payload) as Record<string, unknown>);
          } catch {
            // ignore
          }
        }
      }
    }
  });

  return raw.pipeThrough(transform);
}

/**
 * `useChat` transport that proxies through the oRPC `agent.chatStream`
 * procedure. The server forwards the streaming request to the agent
 * Worker (via service binding in prod, env URL in dev) and re-emits the
 * chunks as an oRPC event iterator. The client converts that iterator
 * back into a byte stream, decodes the AI SDK SSE format produced by
 * `toUIMessageStreamResponse`, and yields `UIMessageChunk` objects to
 * `useChat`.
 *
 * `reconnectToStream` is intentionally unsupported per the oRPC + AI
 * SDK integration docs — most chat UIs don't need it.
 */
export function useAgentChat() {
  return useChat({
    transport: {
      async sendMessages(options) {
        const raw = eventIteratorToUnproxiedDataStream(
          await orpcClient.agent.chatStream(
            {
              agentId: DEFAULT_AGENT_ID,
              // Server schema is `z.array(z.any())`; the structural type
              // comes back as the resolved `UIMessage` from the server's
              // ai version, which TS treats as "two different types with
              // this name" against the `UIMessage` `useChat` ships.
              // Runtime is fine.
              messages: options.messages as never
            },
            { signal: options.abortSignal }
          )
        );
        // The `ai` package ships two distinct `UIMessageChunk` types in
        // the workspace — `useChat` resolves one and the server the
        // other. They're structurally identical; cast through `unknown`
        // so the cross-version type identity mismatch is suppressed.
        return sseToUIMessageStream(
          raw as ReadableStream<Uint8Array>
        ) as unknown as ReadableStream<never>;
      },
      reconnectToStream() {
        throw new Error("Stream reconnection is not supported.");
      }
    }
  });
}
