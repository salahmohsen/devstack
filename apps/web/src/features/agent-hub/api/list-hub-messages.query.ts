import { type UIMessage } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { mastraDbMessagesToUiMessages } from "@tsu-stack/api/routers/agent.list-hub-messages";

import { HUB_AGENT_ID } from "./use-hub-chat";

export const HUB_MESSAGES_PAGE_SIZE = 40;

export type HubMessagesPageResult = {
  uiMessages: UIMessage[];
  hasMore: boolean;
  page: number;
};

export function isHubUiMessageArray(value: unknown): value is UIMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) => m && typeof m === "object" && "role" in m && (m as { role: string }).role !== undefined
    )
  );
}

export const listHubMessagesQueryKeys = {
  page(page: number) {
    return orpcQueryClient.agent.listHubMessages.key({
      input: { agentId: HUB_AGENT_ID, limit: HUB_MESSAGES_PAGE_SIZE, page }
    });
  }
};

/**
 * Paginated hub transcript from Mastra Memory.
 * Page 0 is the newest window; higher pages are older.
 */
export function listHubMessagesQueryOptions(page = 0) {
  return orpcQueryClient.agent.listHubMessages.queryOptions({
    input: { agentId: HUB_AGENT_ID, limit: HUB_MESSAGES_PAGE_SIZE, page },
    retry: false
  });
}

export function useListHubMessagesQuery(enabled: boolean, page = 0) {
  return useQuery({
    ...listHubMessagesQueryOptions(page),
    enabled,
    staleTime: 60_000
  });
}

export type ListHubMessagesQueryResult = Awaited<
  ReturnType<typeof orpcClient.agent.listHubMessages>
>;

/** Imperative page fetch for the history adapter and load-older. */
export async function fetchHubMessagesPage(page: number): Promise<HubMessagesPageResult> {
  const data = await orpcClient.agent.listHubMessages({
    agentId: HUB_AGENT_ID,
    limit: HUB_MESSAGES_PAGE_SIZE,
    page
  });
  const fromUi = isHubUiMessageArray(data.uiMessages) ? data.uiMessages : [];
  const fromDb =
    fromUi.length === 0 && Array.isArray(data.messages)
      ? mastraDbMessagesToUiMessages(data.messages)
      : [];
  return {
    uiMessages: fromUi.length > 0 ? fromUi : isHubUiMessageArray(fromDb) ? fromDb : [],
    hasMore: data.hasMore,
    page: data.page
  };
}
