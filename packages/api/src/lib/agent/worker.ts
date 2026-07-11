import { type OrpcContextAgentWorker } from "#@/lib/context/types";

export type AgentWorkerEnv = {
  AGENT_WORKER?: Fetcher;
  AGENT_WORKER_URL?: string;
};

export function createAgentWorker(env: AgentWorkerEnv): OrpcContextAgentWorker {
  return {
    fetch(input, init) {
      // Both service bindings and global fetch require absolute URLs.
      // Resolve relative paths using AGENT_WORKER_URL before dispatching.
      const baseUrl = env.AGENT_WORKER_URL;
      const inputUrl = input instanceof Request ? input.url : String(input);
      const resolved = baseUrl ? new URL(inputUrl, baseUrl).href : inputUrl;

      const binding = env.AGENT_WORKER;
      if (binding) {
        return binding.fetch(resolved, init);
      }
      if (!baseUrl) {
        throw new Error(
          "Agent worker is not configured. Set AGENT_WORKER_URL or add a service binding."
        );
      }
      const request = new Request(resolved, init);
      return fetch(resolved, {
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
