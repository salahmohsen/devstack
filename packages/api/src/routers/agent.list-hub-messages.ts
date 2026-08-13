/**
 * Shape Mastra `/memory/threads/:id/messages` pages for hub chat history.
 * Page 0 is the newest window; higher pages are older. Each page is oldest→newest.
 */

export type HubMessagesPage = {
  messages: unknown[];
  uiMessages: unknown[] | null;
  hasMore: boolean;
  page: number;
};

export function emptyHubMessagesPage(page: number): HubMessagesPage {
  return { messages: [], uiMessages: [], hasMore: false, page };
}

export function computeHubMessagesHasMore(input: {
  page: number;
  perPage: number;
  messageCount: number;
  upstreamHasMore?: unknown;
  upstreamTotal?: unknown;
}): boolean {
  if (typeof input.upstreamHasMore === "boolean") {
    return input.upstreamHasMore;
  }
  if (typeof input.upstreamTotal === "number" && Number.isFinite(input.upstreamTotal)) {
    return (input.page + 1) * input.perPage < input.upstreamTotal;
  }
  return input.messageCount === input.perPage;
}

/**
 * AI SDK UIMessage has no required createdAt. Mastra DB rows do.
 * Copy onto `metadata.createdAt` (ISO) so day separators can read one field.
 */
export function attachCreatedAtToUiMessages(
  uiMessages: unknown[] | null,
  rawMessages: unknown[]
): unknown[] | null {
  if (uiMessages == null) return null;

  const createdAtById = new Map<string, string>();
  for (const raw of rawMessages) {
    const id = readMessageId(raw);
    const createdAt = readCreatedAtIso(raw);
    if (id && createdAt) createdAtById.set(id, createdAt);
  }

  return uiMessages.map((ui) => {
    if (!isRecord(ui)) return ui;

    const existing = readCreatedAtIso(ui);
    const id = readMessageId(ui);
    const createdAt = existing ?? (id ? (createdAtById.get(id) ?? null) : null);
    if (!createdAt) return ui;

    const metadata = isRecord(ui.metadata) ? ui.metadata : {};
    if (metadata.createdAt === createdAt) return ui;

    return {
      ...ui,
      metadata: { ...metadata, createdAt }
    };
  });
}

/** Reverse a newest-first page so the client can render oldest→newest. */
export function orderHubMessagesChronologically(messages: unknown[]): unknown[] {
  if (messages.length < 2) return messages;

  const first = readCreatedAtMs(messages[0]);
  const last = readCreatedAtMs(messages[messages.length - 1]);
  if (first == null || last == null || first <= last) return messages;

  return messages.slice().toReversed();
}

export function shapeListHubMessagesPage(input: {
  page: number;
  perPage: number;
  messages: unknown;
  uiMessages: unknown;
  hasMore?: unknown;
  total?: unknown;
}): HubMessagesPage {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const uiMessages = Array.isArray(input.uiMessages) ? input.uiMessages : null;
  const withTimestamps = attachCreatedAtToUiMessages(uiMessages, messages);
  const orderedMessages = orderHubMessagesChronologically(messages);
  const orderedUi = withTimestamps == null ? null : orderHubMessagesChronologically(withTimestamps);
  const messageCount = Math.max(orderedMessages.length, orderedUi?.length ?? 0);

  return {
    messages: orderedMessages,
    uiMessages: orderedUi,
    hasMore: computeHubMessagesHasMore({
      page: input.page,
      perPage: input.perPage,
      messageCount,
      upstreamHasMore: input.hasMore,
      upstreamTotal: input.total
    }),
    page: input.page
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMessageId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }
  return value.id;
}

function readCreatedAtIso(value: unknown): string | null {
  if (!isRecord(value)) return null;

  const top = toIsoCreatedAt(value.createdAt);
  if (top) return top;

  if (!isRecord(value.metadata)) return null;
  return toIsoCreatedAt(value.metadata.createdAt);
}

function readCreatedAtMs(value: unknown): number | null {
  const iso = readCreatedAtIso(value);
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function toIsoCreatedAt(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}
