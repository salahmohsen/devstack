import { agentAuthHeaders } from "#@/lib/agent/agent-fetch";
import { type OrpcContextAgentWorker } from "#@/lib/context/types";

export type AgentWorkerEnv = {
  AGENT_WORKER_URL?: string;
  /** Better Auth session token for MastraAuthBetterAuth. */
  sessionToken?: string | null;
};

/**
 * Thin fetch wrapper for the Mastra agent process.
 * Injects the user's Better Auth session as Bearer (Mastra docs: Better Auth).
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
      for (const [k, v] of Object.entries(agentAuthHeaders(env.sessionToken))) {
        if (!headers.has(k)) headers.set(k, v);
      }
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
