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

/**
 * Mastra `recall()` / GET `/memory/threads/:id/messages` returns DB rows in
 * `messages` and usually `uiMessages: null`. Lift those rows to AI SDK
 * UIMessages so hub hydrate is not empty.
 */
export function mastraDbMessagesToUiMessages(rawMessages: unknown[]): unknown[] {
  const converted: unknown[] = [];
  for (const raw of rawMessages) {
    const ui = mastraDbMessageToUiMessage(raw);
    if (ui) converted.push(ui);
  }
  return converted;
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
  const providedUi = Array.isArray(input.uiMessages) ? input.uiMessages : null;
  const uiMessages =
    providedUi != null && providedUi.length > 0
      ? providedUi
      : messages.length > 0
        ? mastraDbMessagesToUiMessages(messages)
        : providedUi;
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

const HUB_UI_ROLES = new Set(["user", "assistant", "system"]);

function mastraDbMessageToUiMessage(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const role = typeof raw.role === "string" ? raw.role : null;
  if (!role || !HUB_UI_ROLES.has(role)) return null;

  const id = readMessageId(raw);
  if (!id) return null;

  if (Array.isArray(raw.parts)) {
    return { id, role, parts: raw.parts };
  }

  const content = raw.content;
  if (typeof content === "string") {
    return { id, role, parts: content.length > 0 ? [{ type: "text", text: content }] : [] };
  }

  if (!isRecord(content)) return null;

  const parts = mastraDbPartsToUiParts(content);
  if (parts.length === 0 && typeof content.content === "string" && content.content.length > 0) {
    parts.push({ type: "text", text: content.content });
  }

  const metadata = isRecord(content.metadata) ? { ...content.metadata } : undefined;
  return metadata ? { id, role, parts, metadata } : { id, role, parts };
}

function mastraDbPartsToUiParts(content: Record<string, unknown>): unknown[] {
  const parts: unknown[] = [];
  const seenToolCallIds = new Set<string>();

  if (Array.isArray(content.parts)) {
    for (const part of content.parts) {
      const uiPart = mastraDbPartToUiPart(part);
      if (!uiPart) continue;
      const toolCallId = readToolCallId(uiPart);
      if (toolCallId) {
        if (seenToolCallIds.has(toolCallId)) continue;
        seenToolCallIds.add(toolCallId);
      }
      parts.push(uiPart);
    }
  }

  if (Array.isArray(content.toolInvocations)) {
    for (const invocation of content.toolInvocations) {
      const uiPart = toolInvocationToUiPart(invocation);
      if (!uiPart) continue;
      const toolCallId = readToolCallId(uiPart);
      if (toolCallId) {
        if (seenToolCallIds.has(toolCallId)) continue;
        seenToolCallIds.add(toolCallId);
      }
      parts.push(uiPart);
    }
  }

  return parts;
}

function mastraDbPartToUiPart(part: unknown): Record<string, unknown> | null {
  if (!isRecord(part) || typeof part.type !== "string") return null;

  if (part.type === "tool-invocation") {
    return toolInvocationToUiPart(part.toolInvocation);
  }

  if (part.type === "reasoning") {
    const text = reasoningText(part);
    return text == null ? null : { type: "reasoning", text };
  }

  return part;
}

function toolInvocationToUiPart(invocation: unknown): Record<string, unknown> | null {
  if (!isRecord(invocation)) return null;

  const toolCallId = typeof invocation.toolCallId === "string" ? invocation.toolCallId : null;
  const toolName = typeof invocation.toolName === "string" ? invocation.toolName : null;
  if (!toolCallId || !toolName) return null;

  const state = mapToolInvocationState(invocation.state, invocation);
  const part: Record<string, unknown> = {
    type: `tool-${toolName}`,
    toolCallId,
    toolName,
    state,
    input: invocation.args ?? invocation.input ?? {}
  };

  if (state === "output-available") {
    part.output = invocation.result ?? invocation.output;
  }
  if (state === "output-error") {
    part.errorText =
      typeof invocation.errorText === "string"
        ? invocation.errorText
        : typeof invocation.result === "string"
          ? invocation.result
          : "";
  }

  const approval = toolApprovalFromInvocation(invocation);
  if (approval) part.approval = approval;

  return part;
}

function mapToolInvocationState(state: unknown, invocation: Record<string, unknown>): string {
  if (state === "partial-call" || state === "input-streaming") return "input-streaming";
  if (state === "call" || state === "input-available") return "input-available";
  if (state === "approval-requested") return "approval-requested";
  if (state === "approval-responded") return "approval-responded";
  if (state === "output-error") return "output-error";
  if (state === "output-denied") return "output-available";
  if (state === "result" || state === "output-available") return "output-available";
  if (invocation.result !== undefined || invocation.output !== undefined) return "output-available";
  return "input-available";
}

function toolApprovalFromInvocation(
  invocation: Record<string, unknown>
): Record<string, unknown> | null {
  if (!isRecord(invocation.approval) || typeof invocation.approval.id !== "string") {
    return null;
  }
  const approval: Record<string, unknown> = { id: invocation.approval.id };
  if (typeof invocation.approval.approved === "boolean") {
    approval.approved = invocation.approval.approved;
  }
  if (typeof invocation.approval.reason === "string") {
    approval.reason = invocation.approval.reason;
  }
  return approval;
}

function reasoningText(part: Record<string, unknown>): string | null {
  if (typeof part.text === "string") return part.text;
  if (typeof part.reasoning === "string") return part.reasoning;
  return null;
}

function readToolCallId(part: unknown): string | null {
  if (!isRecord(part) || typeof part.toolCallId !== "string" || part.toolCallId.length === 0) {
    return null;
  }
  return part.toolCallId;
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
