import { type OrpcContextAgentWorker } from "#@/lib/context/types";

export type AgentWorkerEnv = {
  AGENT_WORKER_URL?: string;
};

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

      return fetch(resolved, {
        ...init,
        method: init?.method ?? (input instanceof Request ? input.method : "GET"),
        headers: init?.headers,
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
