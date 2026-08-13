import { type UIMessage } from "@ai-sdk/react";
import {
  bindExternalStoreMessage,
  ExportedMessageRepository,
  type ThreadHistoryAdapter,
  type ThreadMessageLike
} from "@assistant-ui/react";

import { messageCreatedAt } from "./hub-ui-message-time";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolPartType(type: string): boolean {
  return type.startsWith("tool-") || type === "dynamic-tool" || type === "tool-invocation";
}

/**
 * Regenerated replies are either text-only or a complete tool+text turn.
 * A tool-bearing message followed by a *text-only* assistant is a multi-step
 * turn (list → answer) and must stay linear, or BranchPicker shows 2/2.
 */
export function isPureTextHubAssistantReply(message: UIMessage): boolean {
  if (message.role !== "assistant") return false;
  let hasText = false;
  for (const raw of (message.parts ?? []) as unknown[]) {
    if (!isRecord(raw) || typeof raw.type !== "string") continue;
    if (isToolPartType(raw.type)) return false;
    if (raw.type === "text" && typeof raw.text === "string" && raw.text.trim().length > 0) {
      hasText = true;
    }
  }
  return hasText;
}

export function isToolBearingHubAssistant(message: UIMessage): boolean {
  if (message.role !== "assistant") return false;
  for (const raw of (message.parts ?? []) as unknown[]) {
    if (isRecord(raw) && typeof raw.type === "string" && isToolPartType(raw.type)) {
      return true;
    }
  }
  return false;
}

function areRegenerateSiblings(previous: UIMessage, current: UIMessage): boolean {
  const prevText = isPureTextHubAssistantReply(previous);
  const currText = isPureTextHubAssistantReply(current);
  if (prevText && currText) return true;
  return isToolBearingHubAssistant(previous) && isToolBearingHubAssistant(current);
}

export function hubHistoryHasBranches(items: HubHistoryItem[]): boolean {
  const childCount = new Map<string, number>();
  for (const item of items) {
    if (item.parentId == null) continue;
    childCount.set(item.parentId, (childCount.get(item.parentId) ?? 0) + 1);
  }
  return [...childCount.values()].some((count) => count > 1);
}

/**
 * Map Mastra UIMessages to an assistant-ui repository.
 * Consecutive regenerate-shaped assistants share the user parent.
 * Tool-then-text stays linear so multi-step turns do not become 2/2.
 */
export function mapUiMessagesToHistoryItems(
  uiMessages: UIMessage[],
  fmt?: HistoryIdFormat
): HubHistoryItem[] {
  const withIds = uiMessages.filter(hasMessageId);
  const items: HubHistoryItem[] = [];
  let lastId: string | null = null;
  let lastUserId: string | null = null;
  let lastAssistant: UIMessage | null = null;

  for (const message of withIds) {
    const id = historyMessageId(message, fmt);
    if (message.role === "assistant") {
      const sibling =
        lastAssistant != null &&
        lastUserId != null &&
        areRegenerateSiblings(lastAssistant, message);
      items.push({ parentId: sibling ? lastUserId : lastId, message });
      lastAssistant = message;
      lastId = id;
      continue;
    }

    items.push({ parentId: lastId, message });
    lastUserId = message.role === "user" ? id : lastUserId;
    lastAssistant = null;
    lastId = id;
  }

  return items;
}

/** Visible path for the latest sibling at each branch (head). */
export function hubHistoryHeadPath(items: HubHistoryItem[], fmt?: HistoryIdFormat): UIMessage[] {
  if (items.length === 0) return [];

  const byId = new Map<string, HubHistoryItem>();
  for (const item of items) {
    byId.set(historyMessageId(item.message, fmt), item);
  }

  const last = items[items.length - 1]!;
  const path: UIMessage[] = [];
  let current: HubHistoryItem | undefined = last;
  const seen = new Set<string>();
  while (current) {
    const id = historyMessageId(current.message, fmt);
    if (seen.has(id)) break;
    seen.add(id);
    path.push(current.message);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path.toReversed();
}

export function unionHubMessages(base: UIMessage[], extra: UIMessage[]): UIMessage[] {
  const seen = new Set(base.filter(hasMessageId).map((message) => message.id));
  const merged = [...base];
  for (const message of extra) {
    if (!hasMessageId(message) || seen.has(message.id)) continue;
    seen.add(message.id);
    merged.push(message);
  }
  return merged;
}

type ThreadContentPart = Exclude<ThreadMessageLike["content"], string>[number];

function uiPartsToThreadContent(parts: UIMessage["parts"]): ThreadContentPart[] {
  const content: ThreadContentPart[] = [];
  for (const raw of (parts ?? []) as unknown[]) {
    if (!isRecord(raw) || typeof raw.type !== "string") continue;
    if (raw.type === "text" && typeof raw.text === "string") {
      content.push({ type: "text", text: raw.text });
      continue;
    }
    if (raw.type === "reasoning") {
      const text = typeof raw.text === "string" ? raw.text : "";
      if (text.length > 0) content.push({ type: "reasoning", text });
      continue;
    }
    if (raw.type.startsWith("tool-") || raw.type === "dynamic-tool") {
      const toolCallId = typeof raw.toolCallId === "string" ? raw.toolCallId : "";
      if (!toolCallId) continue;
      const toolName =
        typeof raw.toolName === "string" && raw.toolName.length > 0
          ? raw.toolName
          : raw.type === "dynamic-tool"
            ? "tool"
            : raw.type.slice("tool-".length);
      content.push({
        type: "tool-call",
        toolCallId,
        toolName,
        args: (isRecord(raw.input) ? raw.input : isRecord(raw.args) ? raw.args : {}) as NonNullable<
          Extract<ThreadContentPart, { type: "tool-call" }>["args"]
        >,
        ...(raw.output !== undefined ? { result: raw.output } : {}),
        ...(raw.state === "output-error" ? { isError: true } : {})
      });
    }
  }
  return content;
}

/** Repository import so BranchPicker can restore regenerate siblings after reload. */
export function hubHistoryExportedRepository(
  items: HubHistoryItem[],
  fmt?: HistoryIdFormat
): ExportedMessageRepository {
  const repo = ExportedMessageRepository.fromBranchableArray(
    items.map(({ parentId, message }) => {
      return {
        parentId,
        message: {
          id: historyMessageId(message, fmt),
          role: message.role,
          createdAt: messageCreatedAt(message) ?? undefined,
          content: uiPartsToThreadContent(message.parts),
          metadata: message.metadata as ThreadMessageLike["metadata"]
        }
      };
    }),
    {
      headId: items.length > 0 ? historyMessageId(items[items.length - 1]!.message, fmt) : null
    }
  );

  for (const [index, item] of items.entries()) {
    const imported = repo.messages[index]?.message;
    if (imported) bindExternalStoreMessage(imported, item.message);
  }

  return repo;
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
