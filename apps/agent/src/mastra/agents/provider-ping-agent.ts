import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

/**
 * Minimal BYO credential probe for Settings → AI "Test connection".
 * No tools, no memory, no skills — one short reply.
 */
export function createProviderPingAgent() {
  return new Agent({
    id: "provider-ping",
    name: "Provider Ping",
    description: "Probes a BYO provider API key with a one-token reply.",
    instructions: `You are a connection probe. Reply with exactly the single word: ok
Do not add punctuation, explanation, or tools.`,
    model: byoModelFromRequestContext
  });
}

export default createProviderPingAgent;
