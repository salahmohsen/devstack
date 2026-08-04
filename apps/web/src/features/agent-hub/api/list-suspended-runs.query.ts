import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { HUB_AGENT_ID } from "./use-hub-chat";

export type SuspendedRun = {
  runId: string;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    requiresApproval: boolean;
  }>;
};

/**
 * Lazy suspended-run list for hub HITL resume banner.
 * Server forces threadId/resourceId from the session — client does not send them.
 */
export function listSuspendedRunsQueryOptions() {
  return orpcQueryClient.agent.listSuspendedRuns.queryOptions({
    input: { agentId: HUB_AGENT_ID }
  });
}

export function useListSuspendedRunsQuery(enabled: boolean) {
  return useQuery({
    ...listSuspendedRunsQueryOptions(),
    enabled,
    staleTime: 30_000
  });
}
