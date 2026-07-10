import { stripTrailingSlashes } from "@tsu-stack/core";

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
        return binding.fetch(input, init);
      }
      const baseUrl = env.AGENT_WORKER_URL;
      if (!baseUrl) {
        throw new Error(
          "Agent worker is not configured. Set AGENT_WORKER_URL or add a service binding."
        );
      }
      const request = new Request(input, init);
      const url = new URL(request.url, stripTrailingSlashes(baseUrl));
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
