import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { HUB_AGENT_ID } from "./use-hub-chat";

/**
 * Last hub chat messages from Mastra Memory (session-scoped thread).
 * Used once on mount to hydrate `useChat` after refresh.
 */
export function listHubMessagesQueryOptions() {
  return orpcQueryClient.agent.listHubMessages.queryOptions({
    input: { agentId: HUB_AGENT_ID, limit: 40 }
  });
}

export function useListHubMessagesQuery(enabled: boolean) {
  return useQuery({
    ...listHubMessagesQueryOptions(),
    enabled,
    staleTime: 60_000
  });
}
