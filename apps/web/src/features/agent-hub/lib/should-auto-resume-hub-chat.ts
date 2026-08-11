import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";

/**
 * Tools that intentionally wait for the client (`addToolOutput`) before the
 * agent loop may continue. Server-executed CRM tools must NOT be listed here.
 *
 * Mastra / AI SDK names vary (kebab vs camel registration keys).
 */
export const HUB_CLIENT_RESUME_TOOL_NAMES = new Set([
  "propose-application-from-jd",
  "proposeApplicationFromJd"
]);

type ToolLikePart = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  /** When true, tool ran on the server — client must not auto-resubmit for it. */
  providerExecuted?: boolean;
};

function isToolUiPart(part: { type: string }): boolean {
  return (
    part.type === "dynamic-tool" ||
    part.type.startsWith("tool-") ||
    // Mastra sometimes streams with bare tool ids
    Boolean((part as ToolLikePart).toolCallId && (part as ToolLikePart).toolName)
  );
}

function toolNameFromPart(part: ToolLikePart): string {
  if (part.toolName && part.toolName.length > 0) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.type;
}

function isClientResumeTool(part: ToolLikePart): boolean {
  if (part.providerExecuted === true) return false;
  return HUB_CLIENT_RESUME_TOOL_NAMES.has(toolNameFromPart(part));
}

/**
 * True when the **last step** of the last assistant message has client-resume
 * tools that all have results (user finished the card / UI).
 *
 * Unlike AI SDK `lastAssistantMessageIsCompleteWithToolCalls`, this ignores
 * server-side tools. Mastra often omits `providerExecuted` on agent tools;
 * treating every completed tool as client-side re-submits the chat forever
 * (answer streams → vanishes → regenerates).
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
 * @see AI SDK `lastAssistantMessageIsCompleteWithToolCalls` (filters only
 *      `providerExecuted === true`)
 */
export function lastAssistantMessageIsCompleteWithClientResumeTools({
  messages
}: {
  messages: UIMessage[];
}): boolean {
  const message = messages[messages.length - 1];
  if (!message || message.role !== "assistant") return false;

  const parts = message.parts as ToolLikePart[];
  const lastStepStartIndex = parts.reduce(
    (lastIndex, part, index) => (part.type === "step-start" ? index : lastIndex),
    -1
  );

  const lastStepClientTools = parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUiPart)
    .filter(isClientResumeTool);

  if (lastStepClientTools.length === 0) return false;

  return lastStepClientTools.every(
    (part) => part.state === "output-available" || part.state === "output-error"
  );
}

/**
 * True when the last step still needs a server continuation (approval responded
 * but no final text in that step yet). Avoids re-POSTing after a finished turn
 * that still carries `approval-responded` parts from earlier in the message.
 */
function lastStepNeedsApprovalContinuation({ messages }: { messages: UIMessage[] }): boolean {
  if (!lastAssistantMessageIsCompleteWithApprovalResponses({ messages })) {
    return false;
  }
  const message = messages[messages.length - 1];
  if (!message || message.role !== "assistant") return false;
  const parts = message.parts as Array<{ type: string; text?: string; state?: string }>;
  const lastStepStartIndex = parts.reduce(
    (lastIndex, part, index) => (part.type === "step-start" ? index : lastIndex),
    -1
  );
  const lastStep = parts.slice(lastStepStartIndex + 1);
  // Final text already present in last step → stream finished; do not re-submit.
  const hasFinalText = lastStep.some(
    (p) => p.type === "text" && Boolean(p.text?.trim()) && p.state !== "streaming"
  );
  return !hasFinalText;
}

/**
 * Hub `sendAutomaticallyWhen`: resume only after:
 * 1. User answered a requireToolApproval gate (and final answer not yet streamed)
 * 2. User completed a client HITL tool (e.g. propose-from-jd card)
 *
 * Do **not** use bare `lastAssistantMessageIsCompleteWithToolCalls` — it
 * restarts the agent after every server multi-step tool chain.
 */
export function shouldAutoResumeHubChat({ messages }: { messages: UIMessage[] }): boolean {
  return (
    lastStepNeedsApprovalContinuation({ messages }) ||
    lastAssistantMessageIsCompleteWithClientResumeTools({ messages })
  );
}
