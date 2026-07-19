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

      const request = new Request(resolved, init);
      return fetch(resolved, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        // @ts-expect-error - duplex is non-standard but supported in Node 18+
        duplex: "half"
      });
    }
  };
}
