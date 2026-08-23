import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";

import { searchBriefUserTurnNeedsSpokenAnswer } from "@tsu-stack/core";

import {
  HUB_FIND_JOBS_NOW_TOOL_NAMES,
  HUB_GET_DAILY_BRIEF_TOOL_NAMES,
  HUB_GET_SEARCH_BRIEF_TOOL_NAMES,
  HUB_OPEN_DAILY_BRIEF_TOOL_NAMES,
  HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES,
  HUB_OPEN_ENTITY_FORM_TOOL_NAMES,
  HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES,
  HUB_OPEN_SURFACE_TOOL_NAMES,
  HUB_PROPOSE_APPLICATION_FROM_JD_TOOL_NAMES,
  HUB_PROPOSE_APPLICATION_FIELD_CHANGE_TOOL_NAMES,
  HUB_PROPOSE_BATCH_GENERATE_PACKAGES_TOOL_NAMES,
  HUB_PROPOSE_BATCH_TRACKING_CHANGE_TOOL_NAMES,
  HUB_PROPOSE_DELETE_APPLICATION_TOOL_NAMES,
  HUB_PROPOSE_DELETE_NOTE_TOOL_NAMES,
  HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES,
  HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES,
  HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES,
  HUB_PROPOSE_REFRESH_FROM_URL_TOOL_NAMES,
  HUB_PROPOSE_SET_OUTCOME_TOOL_NAMES,
  isLaterEvidenceAfterSameEntityConfirm
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
  ...HUB_GET_SEARCH_BRIEF_TOOL_NAMES,
  ...HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES,
  ...HUB_OPEN_DAILY_BRIEF_TOOL_NAMES,
  ...HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES,
  ...HUB_PROPOSE_APPLICATION_FIELD_CHANGE_TOOL_NAMES,
  ...HUB_PROPOSE_SET_OUTCOME_TOOL_NAMES,
  ...HUB_PROPOSE_DELETE_APPLICATION_TOOL_NAMES,
  ...HUB_PROPOSE_DELETE_NOTE_TOOL_NAMES,
  ...HUB_PROPOSE_BATCH_TRACKING_CHANGE_TOOL_NAMES,
  ...HUB_PROPOSE_BATCH_GENERATE_PACKAGES_TOOL_NAMES,
  ...HUB_PROPOSE_REFRESH_FROM_URL_TOOL_NAMES
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

const SEARCH_BRIEF_WRAPUP_RE = /search brief is current|here(?:'s| is) your (?:search )?brief/i;

const DAILY_BRIEF_WRAPUP_RE = /today is open in the side panel|^#\s*today\b|^\*\*new in/im;

const TODAY_IDLE_LINE_RE =
  /^(hey|ready|still here|that's the whole plot|thats the whole plot|no sequel yet|checking|working through it)\.?\s*$/i;

const FAILED_CONTINUATION_TEXT_RE =
  /tool-step limit|step limit was reached|couldn.?t run|could not run|couldn.?t execute/i;

const PROCESSOR_LEAK_RE =
  /<system-reminder>|Call getDailyBrief now|call openDailyBrief|already returned facts\. Write the Today letter|already returned markdown|Do NOT call getSearchBrief|Extract already ran\. Do NOT call jobPageExtractor|Call getDailyBrief now for facts|listNewJobs already returned|Call propose-new-jobs-triage NOW|The triage card is the UI|Emit ZERO user-facing text/i;

export function isHubProcessorLeakText(text: string): boolean {
  return PROCESSOR_LEAK_RE.test(text);
}

const PROMISED_CATALOG_RE =
  /let me pull.{0,40}stack list|pulling (your |the )?(full )?stack list|i('ll| will) gather your full (profile|stack)/i;

/** Spoken “I’m pulling stacks” with no catalog UI — hide this line. */
export function isHubPromisedCatalogText(text: string): boolean {
  return PROMISED_CATALOG_RE.test(text.trim());
}

function looksLikeDailyBriefLetter(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (DAILY_BRIEF_WRAPUP_RE.test(t)) return true;
  if (/^#{1,3}\s/m.test(t) && /\b(new jobs|tracked|mail|the pile)\b/i.test(t)) return true;
  return /^#\s+\w+day\s+\d{1,2}\s+\w+/im.test(t) && t.length > 80;
}

/** Letter paste (safe to hide in any bubble — not a greeting). */
export function isHubTodayLetterPaste(text: string): boolean {
  return looksLikeDailyBriefLetter(text.trim());
}

/** Letter paste or the supervisor idle loop after Today. */
export function isHubTodayFillerText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (isHubProcessorLeakText(t)) return true;
  if (looksLikeDailyBriefLetter(t)) return true;
  if (TODAY_IDLE_LINE_RE.test(t)) return true;
  const lines = t
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 && lines.every((line) => TODAY_IDLE_LINE_RE.test(line));
}

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

function latestUserMessageText(messages: readonly UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || message.role !== "user") continue;
    const chunks: string[] = [];
    for (const part of message.parts ?? []) {
      if (part && part.type === "text" && "text" in part && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
    return chunks.join("\n");
  }
  return "";
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
  let lastDailyBrief = -1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || !isToolUiPart(part)) continue;
    const name = toolNameFromPart(part);
    const todayToolDone =
      isClientToolComplete(part) ||
      (HUB_GET_DAILY_BRIEF_TOOL_NAMES.has(name) && part.output != null);
    if (
      (HUB_OPEN_DAILY_BRIEF_TOOL_NAMES.has(name) || HUB_GET_DAILY_BRIEF_TOOL_NAMES.has(name)) &&
      todayToolDone
    ) {
      lastDailyBrief = i;
    }
    if (!isClientResumeTool(part)) continue;
    if (isClientToolWaiting(part)) lastWaiting = i;
    else if (isClientToolComplete(part)) lastComplete = i;
  }

  if (lastDailyBrief >= 0 && lastWaiting < 0) {
    const after = parts.slice(lastDailyBrief + 1);
    const laterTool = after.some((part) => isToolUiPart(part));
    // Packed inspect / CRM after the letter may speak. Today-only: the panel
    // is the letter — hide the supervisor idle loop.
    if (laterTool) return null;
    return lastDailyBrief;
  }

  if (lastWaiting >= 0) return lastWaiting;

  if (lastComplete >= 0) {
    const completePart = parts[lastComplete];
    if (completePart) {
      const completeName = toolNameFromPart(completePart);
      if (HUB_FIND_JOBS_NOW_TOOL_NAMES.has(completeName)) {
        return lastComplete;
      }
      if (HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES.has(completeName)) {
        return lastComplete;
      }
      if (HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES.has(completeName)) {
        return lastComplete;
      }
      if (HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES.has(completeName)) {
        // After confirm/cancel, show the next interview. Do not hide because
        // of PREMATURE_HITL_TEXT (that would swallow "Next, RAYA…").
        return null;
      }
      if (HUB_GET_SEARCH_BRIEF_TOOL_NAMES.has(completeName)) {
        const afterBrief = parts
          .slice(lastComplete + 1)
          .filter((p) => p.type === "text" && Boolean(p.text?.trim()))
          .map((p) => p.text ?? "")
          .join("\n");
        if (SEARCH_BRIEF_WRAPUP_RE.test(afterBrief) || PREMATURE_HITL_TEXT_RE.test(afterBrief)) {
          return lastComplete;
        }
        return null;
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

  const leakIdx = parts.findIndex(
    (part) => part.type === "text" && isHubProcessorLeakText(part.text ?? "")
  );
  if (leakIdx >= 0) return leakIdx - 1;

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

  const latestUserText = latestUserMessageText(messages);
  const briefNeedsSpokenAnswer = searchBriefUserTurnNeedsSpokenAnswer(latestUserText);
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
      if (HUB_FIND_JOBS_NOW_TOOL_NAMES.has(name)) {
        return false;
      }
      if (HUB_OPEN_DAILY_BRIEF_TOOL_NAMES.has(name)) {
        return false;
      }
      if (HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES.has(name)) {
        return false;
      }
      if (HUB_GET_SEARCH_BRIEF_TOOL_NAMES.has(name)) {
        return briefNeedsSpokenAnswer && !hasFinalTextAfter;
      }
      if (HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES.has(name)) {
        return false;
      }
      if (HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES.has(name)) {
        return false;
      }
      if (HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES.has(name)) {
        const evidenceOutput =
          p.output && typeof p.output === "object" && !Array.isArray(p.output)
            ? (p.output as { action?: unknown })
            : undefined;
        if (evidenceOutput?.action === "confirm") {
          // A later sibling in this step (same-entity leftover or next card)
          // owns continuation. Resume only when this confirm is the latest.
          const laterEvidence = clientTools.some((other, otherIndex) => {
            if (otherIndex <= clientTools.indexOf(p)) return false;
            return HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES.has(toolNameFromPart(other));
          });
          return !laterEvidence;
        }
        if (evidenceOutput?.action === "cancel") {
          // Auto-cancel of a same-id leftover must not restart the loop.
          if (isLaterEvidenceAfterSameEntityConfirm(messages, p.toolCallId ?? "")) {
            return false;
          }
          const laterEvidence = clientTools.some((other, otherIndex) => {
            if (otherIndex <= clientTools.indexOf(p)) return false;
            return HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES.has(toolNameFromPart(other));
          });
          // A later sibling (usually the same entity again) owns continuation.
          return !laterEvidence;
        }
        return false;
      }
      if (HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES.has(name)) {
        // Side panel already opened. Re-POSTing restacks "Opened project…"
        return false;
      }
      if (HUB_OPEN_SURFACE_TOOL_NAMES.has(name) || HUB_OPEN_ENTITY_FORM_TOOL_NAMES.has(name)) {
        return true;
      }
      const output =
        p.output && typeof p.output === "object" && !Array.isArray(p.output)
          ? (p.output as { action?: unknown; applicationId?: unknown })
          : undefined;
      const action = output?.action;
      // JD card buttons and triage Confirm finish CRM on the client.
      // Re-POSTing after triage confirm re-proposed a second card.
      if (
        action === "dismiss" ||
        action === "cancel" ||
        action === "package" ||
        action === "save" ||
        action === "confirm"
      ) {
        return false;
      }
      return false;
    });

    if (!needsMutationContinuation) {
      const terminal = clientTools.some((p) => {
        const name = toolNameFromPart(p);
        if (HUB_FIND_JOBS_NOW_TOOL_NAMES.has(name)) {
          return true;
        }
        if (HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES.has(name)) {
          return true;
        }
        if (HUB_GET_SEARCH_BRIEF_TOOL_NAMES.has(name)) {
          return !briefNeedsSpokenAnswer;
        }
        if (HUB_GET_DAILY_BRIEF_TOOL_NAMES.has(name)) {
          return true;
        }
        if (HUB_OPEN_DAILY_BRIEF_TOOL_NAMES.has(name)) {
          return true;
        }
        if (HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES.has(name)) {
          return true;
        }
        if (
          HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES.has(name) ||
          HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES.has(name)
        ) {
          return true;
        }
        if (HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES.has(name)) {
          return isLaterEvidenceAfterSameEntityConfirm(messages, p.toolCallId ?? "");
        }
        const output =
          p.output && typeof p.output === "object" && !Array.isArray(p.output)
            ? (p.output as { action?: unknown })
            : undefined;
        return (
          output?.action === "dismiss" ||
          output?.action === "cancel" ||
          output?.action === "package" ||
          output?.action === "save" ||
          output?.action === "confirm"
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
