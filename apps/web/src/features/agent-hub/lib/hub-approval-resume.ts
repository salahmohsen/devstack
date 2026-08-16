import { type UIMessage } from "ai";

type ApprovalLikePart = {
  type?: string;
  toolCallId?: string;
  state?: string;
  approval?: { id?: string };
  data?: {
    runId?: string;
    toolCallId?: string;
    state?: string;
  };
};

function partsOf(message: UIMessage | undefined): ApprovalLikePart[] {
  return (message?.parts ?? []) as ApprovalLikePart[];
}

/** Mastra v6 approval id is `runId::toolCallId`. */
export function findHubApprovalId(messages: UIMessage[], toolCallId: string): string | null {
  if (!toolCallId) return null;
  for (const message of messages) {
    for (const part of partsOf(message)) {
      if (part.toolCallId === toolCallId && typeof part.approval?.id === "string") {
        return part.approval.id;
      }
      const data = part.data;
      const isApprovalData =
        part.type === "data-tool-call-approval" || data?.state === "data-tool-call-approval";
      if (isApprovalData && data?.toolCallId === toolCallId && typeof data.runId === "string") {
        return `${data.runId}::${toolCallId}`;
      }
    }
  }
  return null;
}

/**
 * `Chat.addToolApprovalResponse` only updates `approval-requested` parts.
 * Mastra often leaves the live part as `input-available` and emits
 * `data-tool-call-approval` instead — lift the part so resume can match.
 */
export function withApprovalRequested(
  messages: UIMessage[],
  toolCallId: string,
  approvalId: string
): UIMessage[] {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant" || !toolCallId || !approvalId) return messages;

  let changed = false;
  const parts = partsOf(last).map((part) => {
    if (part.toolCallId !== toolCallId) return part;
    if (part.state === "approval-requested" && part.approval?.id === approvalId) return part;
    changed = true;
    return {
      ...part,
      state: "approval-requested",
      approval: { ...part.approval, id: approvalId }
    };
  });

  if (!changed) return messages;
  return [...messages.slice(0, -1), { ...last, parts } as UIMessage];
}
