import { agentAuthHeaders } from "#@/lib/agent/agent-fetch";
import { type OrpcContextAgentWorker } from "#@/lib/context/types";

export type AgentWorkerEnv = {
  AGENT_WORKER_URL?: string;
};

/**
 * Thin fetch wrapper for the Mastra agent process.
 * Always injects AGENT_SERVICE_SECRET Bearer when configured.
 */
export function createAgentWorker(env: AgentWorkerEnv): OrpcContextAgentWorker {
  return {
    fetch(input, init) {
      const baseUrl = env.AGENT_WORKER_URL;
      if (!baseUrl) {
        throw new Error("Agent worker is not configured. Set AGENT_WORKER_URL.");
      }
      const inputUrl = input instanceof Request ? input.url : String(input);
      const resolved = new URL(inputUrl, baseUrl).href;

      // Pass body through as-is. Re-wrapping a string body via `new Request`
      // turns it into a ReadableStream that requires `duplex: "half"` and can
      // fail under some Node fetch implementations.
      const body = init?.body;
      const needsDuplex =
        typeof body === "object" &&
        body !== null &&
        (typeof (body as { getReader?: unknown }).getReader === "function" ||
          ArrayBuffer.isView(body) ||
          body instanceof ArrayBuffer ||
          body instanceof Blob ||
          body instanceof FormData ||
          body instanceof URLSearchParams);

      const headers = new Headers(init?.headers);
      for (const [k, v] of Object.entries(agentAuthHeaders())) {
        if (!headers.has(k)) headers.set(k, v);
      }
      // Also copy auth from Request object if present
      if (input instanceof Request) {
        input.headers.forEach((value, key) => {
          if (!headers.has(key)) headers.set(key, value);
        });
      }

      return fetch(resolved, {
        ...init,
        method: init?.method ?? (input instanceof Request ? input.method : "GET"),
        headers,
        body,
        ...(needsDuplex
          ? ({
              duplex: "half"
            } as RequestInit)
          : {})
      });
    }
  };
}
