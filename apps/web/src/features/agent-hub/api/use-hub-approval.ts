import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { hubKeys } from "./query-keys";

export type SuspendedRun = {
  runId: string;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    requiresApproval: boolean;
  }>;
};

export function suspendedRunsQueryOptions(threadId: string, resourceId: string) {
  return queryOptions({
    queryKey: hubKeys.suspended(threadId, resourceId),
    queryFn: () =>
      orpcClient.agent.listSuspendedRuns({
        agentId: "hub-supervisor",
        threadId,
        resourceId
      }),
    enabled: !!threadId && !!resourceId,
    staleTime: 30_000
  });
}

export function useSuspendedRuns(threadId: string, resourceId: string) {
  return useQuery(suspendedRunsQueryOptions(threadId, resourceId));
}

export function useApproveToolCall() {
  return useMutation({
    mutationFn: async ({
      runId,
      toolCallId,
      approved
    }: {
      runId: string;
      toolCallId: string;
      approved: boolean;
    }) => {
      // The approve/resume endpoint is the same chatStream — we send a
      // synthetic message that resumes the run with the approval decision.
      // Mastra v6 handles this via the `resume` path on chatRoute.
      const raw = await orpcClient.agent.chatStream({
        agentId: "hub-supervisor",
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              type: "tool-approval",
              runId,
              toolCallId,
              approved
            })
          }
        ] as never
      });
      return raw;
    }
  });
}
