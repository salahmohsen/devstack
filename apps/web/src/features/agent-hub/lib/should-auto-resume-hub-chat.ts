import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";

import {
  HUB_FIND_JOBS_NOW_TOOL_NAMES,
  HUB_GET_SEARCH_BRIEF_TOOL_NAMES,
  HUB_OPEN_ENTITY_FORM_TOOL_NAMES,
  HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES,
  HUB_OPEN_SURFACE_TOOL_NAMES,
  HUB_PROPOSE_APPLICATION_FROM_JD_TOOL_NAMES,
  HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES,
  HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES
} from "./hub-tool-names";

/**
 * Tools that intentionally wait for the client (`addToolOutput`) before the
 * agent loop may continue. Server-executed CRM tools must NOT be listed here.
 *
 * Mastra / AI SDK names vary (kebab vs camel registration keys).
 */
export const HUB_CLIENT_RESUME_TOOL_NAMES = new Set([
  ...HUB_PROPOSE_APPLICATION_FROM_JD_TOOL_NAMES,
  ...HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES,
  ...HUB_OPEN_SURFACE_TOOL_NAMES,
  ...HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES,
  ...HUB_OPEN_ENTITY_FORM_TOOL_NAMES,
  ...HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES,
  ...HUB_FIND_JOBS_NOW_TOOL_NAMES,
  ...HUB_GET_SEARCH_BRIEF_TOOL_NAMES
]);

type ToolLikePart = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  text?: string;
  output?: unknown;
  /** assistant-ui ThreadMessage tool status (requires-action while the card waits). */
  status?: { type?: string };
  /** When true, tool ran on the server — client must not auto-resubmit for it. */
  providerExecuted?: boolean;
};

/** Model wrap-up that is not a real continuation after a HITL card. */
export const PREMATURE_HITL_TEXT_RE =
  /awaiting your confirmation|confirmation is required|no changes made/i;

const FAILED_CONTINUATION_TEXT_RE =
  /tool-step limit|step limit was reached|couldn.?t run|could not run|couldn.?t execute/i;

function isToolUiPart(part: { type: string }): boolean {
  return (
    part.type === "dynamic-tool" ||
    part.type === "tool-call" ||
    part.type.startsWith("tool-") ||
    // Mastra sometimes streams with bare tool ids
    Boolean((part as ToolLikePart).toolCallId && (part as ToolLikePart).toolName)
  );
}

function toolNameFromPart(part: ToolLikePart): string {
  if (part.toolName && part.toolName.length > 0) return part.toolName;
  if (part.type === "tool-call") return "";
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.type;
}

function isClientResumeTool(part: ToolLikePart): boolean {
  if (part.providerExecuted === true) return false;
  return HUB_CLIENT_RESUME_TOOL_NAMES.has(toolNameFromPart(part));
}

function isClientToolComplete(part: ToolLikePart): boolean {
  if (part.status?.type === "complete" || part.status?.type === "incomplete") return true;
  return part.state === "output-available" || part.state === "output-error";
}

function isClientToolWaiting(part: ToolLikePart): boolean {
  if (part.status?.type === "requires-action" || part.status?.type === "running") return true;
  return (
    part.state === "input-available" ||
    part.state === "input-streaming" ||
    part.state === "call" ||
    part.state === "partial-call"
  );
}

/**
 * Hide assistant prose after a client HITL card.
 *
 * Returns the index of the waiting (or just-confirmed) card; text parts after
 * that index should not render. `null` means show every text part.
 *
 * - Pending card: hide everything after it (the card is the confirmation UI).
 * - Confirmed card + only premature wrap-up ("awaiting your confirmation"):
 *   keep hiding that line until a server tool continues the turn.
 */
export function hideHubAssistantTextAfterIndex(parts: readonly ToolLikePart[]): number | null {
  let lastWaiting = -1;
  let lastComplete = -1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || !isToolUiPart(part) || !isClientResumeTool(part)) continue;
    if (isClientToolWaiting(part)) lastWaiting = i;
    else if (isClientToolComplete(part)) lastComplete = i;
  }

  if (lastWaiting >= 0) return lastWaiting;

  if (lastComplete >= 0) {
    const completePart = parts[lastComplete];
    if (completePart) {
      const completeName = toolNameFromPart(completePart);
      if (
        HUB_FIND_JOBS_NOW_TOOL_NAMES.has(completeName) ||
        HUB_GET_SEARCH_BRIEF_TOOL_NAMES.has(completeName)
      ) {
        return lastComplete;
      }
    }
    const after = parts.slice(lastComplete + 1);
    const hasServerAfter = after.some((p) => {
      if (!isToolUiPart(p) || isClientResumeTool(p)) return false;
      return (
        isClientToolComplete(p) ||
        isClientToolWaiting(p) ||
        p.state === "approval-requested" ||
        p.state === "approval-responded"
      );
    });
    if (hasServerAfter) return null;

    const afterText = after
      .filter((p) => p.type === "text" && Boolean(p.text?.trim()))
      .map((p) => p.text ?? "")
      .join("\n");
    if (!afterText.trim()) return null;
    if (FAILED_CONTINUATION_TEXT_RE.test(afterText)) return null;
    if (PREMATURE_HITL_TEXT_RE.test(afterText)) return lastComplete;
  }

  return null;
}

/**
 * True when the latest step that contains client-resume tools has all of those
 * tools completed (user finished the card / UI) and the agent has not already
 * continued past that step (no later text / server tools).
 *
 * Unlike only inspecting the absolute last step: if ensure-final-response adds
 * a trailing text step while a client HITL tool is still open, completing the
 * card still needs to re-POST. Once trackJob/etc. or final text appears *after*
 * the client tools, we stop auto-resuming (avoids infinite re-submit).
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
 */
export function lastAssistantMessageIsCompleteWithClientResumeTools({
  messages
}: {
  messages: UIMessage[];
}): boolean {
  const message = messages[messages.length - 1];
  if (!message || message.role !== "assistant") return false;

  const parts = message.parts as ToolLikePart[];

  const stepStarts: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]?.type === "step-start") stepStarts.push(i);
  }

  // Virtual bounds: before first step-start through end of message.
  const bounds = [-1, ...stepStarts, parts.length];

  for (let b = bounds.length - 2; b >= 0; b--) {
    const from = (bounds[b] ?? -1) + 1;
    const to = bounds[b + 1] ?? parts.length;
    const slice = parts.slice(from, to);
    const clientTools = slice.filter(isToolUiPart).filter(isClientResumeTool);
    if (clientTools.length === 0) continue;

    // Latest step (from the end) that has client HITL tools.
    if (clientTools.some(isClientToolWaiting)) return false;
    if (!clientTools.every(isClientToolComplete)) return false;

    const after = parts.slice(to);
    const hasServerAfter = after.some((p) => {
      if (!isToolUiPart(p)) return false;
      if (isClientResumeTool(p)) return false;
      return (
        p.state === "output-available" ||
        p.state === "output-error" ||
        p.state === "call" ||
        p.state === "input-available" ||
        p.state === "approval-requested" ||
        p.state === "approval-responded"
      );
    });
    // Already ran track/dismiss/etc. after HITL — do not re-submit.
    if (hasServerAfter) return false;

    const hasStreamingTextAfter = after.some(
      (p) => p.type === "text" && Boolean(p.text?.trim()) && p.state === "streaming"
    );
    // Re-POST while wrap-up is streaming loops the same sentence (find-jobs-now).
    if (hasStreamingTextAfter) return false;

    const hasFinalTextAfter = after.some(
      (p) => p.type === "text" && Boolean(p.text?.trim()) && p.state !== "streaming"
    );

    // Confirm / package / save / openSurface need a continuation.
    // If the model already streamed a short "awaiting confirmation" line after
    // the card, still resume once. If later text shows a failed continuation
    // (tool-step limit / couldn't run), do not re-POST forever.
    const needsMutationContinuation = clientTools.some((p) => {
      if (!isClientToolComplete(p)) return false;
      const name = toolNameFromPart(p);
      if (HUB_FIND_JOBS_NOW_TOOL_NAMES.has(name) || HUB_GET_SEARCH_BRIEF_TOOL_NAMES.has(name)) {
        return false;
      }
      if (
        HUB_OPEN_SURFACE_TOOL_NAMES.has(name) ||
        HUB_OPEN_ENTITY_FORM_TOOL_NAMES.has(name) ||
        HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES.has(name)
      ) {
        return true;
      }
      const output =
        p.output && typeof p.output === "object" && !Array.isArray(p.output)
          ? (p.output as { action?: unknown; applicationId?: unknown })
          : undefined;
      const action = output?.action;
      // JD card buttons finish CRM on the client. Do not re-POST — that
      // re-runs URL import and renders a second card for the same listing.
      if (
        action === "dismiss" ||
        action === "cancel" ||
        action === "package" ||
        action === "save"
      ) {
        return false;
      }
      return action === "confirm";
    });

    if (!needsMutationContinuation) {
      const terminal = clientTools.some((p) => {
        const name = toolNameFromPart(p);
        if (HUB_FIND_JOBS_NOW_TOOL_NAMES.has(name) || HUB_GET_SEARCH_BRIEF_TOOL_NAMES.has(name)) {
          return true;
        }
        const output =
          p.output && typeof p.output === "object" && !Array.isArray(p.output)
            ? (p.output as { action?: unknown })
            : undefined;
        return (
          output?.action === "dismiss" ||
          output?.action === "cancel" ||
          output?.action === "package" ||
          output?.action === "save"
        );
      });
      if (terminal) return false;
      return !hasFinalTextAfter;
    }

    if (!hasFinalTextAfter) return true;

    const afterText = after
      .filter((p) => p.type === "text" && Boolean(p.text?.trim()))
      .map((p) => p.text ?? "")
      .join("\n");
    // Only treat classic premature card-close copy as still needing resume.
    if (PREMATURE_HITL_TEXT_RE.test(afterText) && !FAILED_CONTINUATION_TEXT_RE.test(afterText)) {
      return true;
    }
    return false;
  }

  return false;
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
  const hasStreamingText = lastStep.some(
    (p) => p.type === "text" && Boolean(p.text?.trim()) && p.state === "streaming"
  );
  if (hasStreamingText) return false;
  // Final text already present in last step → stream finished; do not re-submit.
  const hasFinalText = lastStep.some(
    (p) => p.type === "text" && Boolean(p.text?.trim()) && p.state !== "streaming"
  );
  return !hasFinalText;
}

/**
 * Hub `sendAutomaticallyWhen`: resume only after:
 * 1. User answered a requireToolApproval gate (and final answer not yet streamed)
 * 2. User completed a client HITL tool (e.g. propose-from-jd / triage card)
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
