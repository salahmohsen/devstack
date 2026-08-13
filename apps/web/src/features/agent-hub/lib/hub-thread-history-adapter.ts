import { type UIMessage } from "@ai-sdk/react";
import { type ThreadHistoryAdapter } from "@assistant-ui/react";

export type HubHistoryPage = {
  uiMessages: UIMessage[];
  hasMore: boolean;
};

export type HubHistoryItem = {
  parentId: string | null;
  message: UIMessage;
};

type HistoryIdFormat = {
  getId: (message: UIMessage) => string;
};

function hasMessageId(message: UIMessage): boolean {
  return typeof message.id === "string" && message.id.length > 0;
}

function historyMessageId(message: UIMessage, fmt?: HistoryIdFormat): string {
  return fmt?.getId(message) ?? message.id;
}

/**
 * Map Mastra UIMessages to a linear assistant-ui repository (parent = previous).
 * Stored rows are UIMessages, not `MessageStorageEntry`, so we do not `fmt.decode`.
 */
export function mapUiMessagesToHistoryItems(
  uiMessages: UIMessage[],
  fmt?: HistoryIdFormat
): HubHistoryItem[] {
  const withIds = uiMessages.filter(hasMessageId);
  return withIds.map((message, index) => {
    return {
      parentId: index === 0 ? null : historyMessageId(withIds[index - 1]!, fmt),
      message
    };
  });
}

/** Prepend an older page onto the current transcript, unique by message id. */
export function prependUniqueHubMessages(older: UIMessage[], current: UIMessage[]): UIMessage[] {
  const seen = new Set(current.map((message) => message.id));
  const uniqueOlder = older.filter((message) => hasMessageId(message) && !seen.has(message.id));
  return uniqueOlder.length === 0 ? current : [...uniqueOlder, ...current];
}

/**
 * Load-only history façade. Mastra Memory is the sole store — `append` is a no-op.
 *
 * `useAISDKRuntime` 1.3 requires `withFormat`. Its built-in `useExternalHistory`
 * only calls `load()` when a Cloud `threadListItem.remoteId` exists, so the
 * provider hydrates page 0 via `setMessages` instead (never both).
 */
export function createHubThreadHistoryAdapter(opts: {
  loadPage: (page: number) => Promise<HubHistoryPage>;
}): ThreadHistoryAdapter {
  return {
    async load() {
      return { headId: null, messages: [] };
    },
    async append() {
      // Mastra persists on stream. Do not dual-write.
    },
    withFormat(formatAdapter) {
      const fmt = formatAdapter as unknown as HistoryIdFormat;
      return {
        async load() {
          const { uiMessages } = await opts.loadPage(0);
          const messages = mapUiMessagesToHistoryItems(uiMessages, fmt);
          const last = messages[messages.length - 1];
          return {
            messages,
            headId: last ? historyMessageId(last.message, fmt) : null
          };
        },
        async append() {
          // Mastra persists on stream. Do not dual-write.
        }
      };
    }
  } as ThreadHistoryAdapter;
}
