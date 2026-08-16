import {
  TokenLimiter,
  ToolCallFilter,
  type ProcessInputStepArgs,
  type Processor
} from "@mastra/core/processors";

import { hubPersonalityById, searchBriefUserTurnNeedsSpokenAnswer } from "@tsu-stack/core";

import {
  filterHubJobUrlImportActiveTools,
  filterHubPostEvidenceConfirmActiveTools,
  filterHubTriageActiveTools,
  HUB_SEARCH_BRIEF_MUST_ANSWER_FEEDBACK,
  HUB_TRIAGE_MUST_PROPOSE_FEEDBACK,
  hubJobUrlImportFeedback,
  isGetSearchBriefToolName,
  isHubClientHitlToolName,
  isHubJobPageExtractToolName,
  isListNewJobsToolName,
  isProposeApplicationFromJdToolName,
  isProposeEvidenceChangeToolName,
  isProposeHardPreferenceChangeToolName,
  isProposeNewJobsTriageToolName,
  isUrlOnlyJobListingPaste
} from "#@/mastra/lib/hub-superpowers-policy";

/** Align with packages/api `HUB_CHAT_MAX_STEPS` and agent defaultOptions. */
export const HUB_SUPERVISOR_MAX_STEPS = 16 as const;

/**
 * Official last-step completion: Mastra may return an empty turn if the model
 * still calls a tool on the final maxSteps iteration.
 *
 * @see https://mastra.ai/docs/agents/processors — Ensure a final response with maxSteps
 */
export class HubEnsureFinalResponseProcessor implements Processor {
  readonly id = "ensure-final-response";
  readonly maxSteps: number;

  constructor(maxSteps: number) {
    this.maxSteps = maxSteps;
  }

  async processInputStep({ stepNumber, sendSignal, messages }: ProcessInputStepArgs) {
    if (stepNumber !== this.maxSteps - 1) {
      return;
    }

    // A pending confirmation card is the user-facing UI. Forcing a last-step
    // "summarize" produces leftover "awaiting your confirmation" prose.
    // Same for URL import: the next step must still be propose-application-from-jd.
    if (
      mastraMessagesHavePendingClientHitl(messages) ||
      messagesNeedProposeAfterJobImport(messages) ||
      messagesNeedProposeTriage(messages) ||
      messagesNeedSearchBriefAnswer(messages)
    ) {
      return;
    }

    await sendSignal?.({
      type: "reactive",
      contents:
        `This is your final step (step ${stepNumber + 1} of ${this.maxSteps}). ` +
        `Do not call any more tools. Summarize what you have found and give the user a complete final answer now.`,
      attributes: { reason: "max-steps-reached", step: stepNumber + 1 }
    });

    // Official processInputStep: disable tools on the last step so the model
    // cannot spend the final LLM call on another tool invocation.
    return { toolChoice: "none" as const };
  }
}

function mastraPartToolName(part: Record<string, unknown>): string {
  if (typeof part.toolName === "string" && part.toolName.length > 0) return part.toolName;
  const invocation = part.toolInvocation;
  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    const name = (invocation as { toolName?: unknown }).toolName;
    if (typeof name === "string" && name.length > 0) return name;
  }
  if (
    typeof part.type === "string" &&
    part.type.startsWith("tool-") &&
    part.type !== "tool-invocation"
  ) {
    return part.type.slice("tool-".length);
  }
  return "";
}

function mastraPartHasToolResult(part: Record<string, unknown>): boolean {
  const invocation = part.toolInvocation;
  const state =
    typeof part.state === "string"
      ? part.state
      : invocation && typeof invocation === "object" && !Array.isArray(invocation)
        ? (invocation as { state?: unknown }).state
        : undefined;
  if (
    state === "output-available" ||
    state === "output-error" ||
    state === "result" ||
    state === "output-denied"
  ) {
    return true;
  }
  if (part.output != null) return true;
  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    return (invocation as { result?: unknown }).result != null;
  }
  return false;
}

function mastraMessageText(message: ProcessInputStepArgs["messages"][number]): string {
  const chunks: string[] = [];
  const content = message.content;
  if (typeof content?.content === "string") chunks.push(content.content);
  const parts = content?.parts;
  if (Array.isArray(parts)) {
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as { type?: string; text?: unknown };
      if (part.type === "text" && typeof part.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n");
}

export function lastUserIsUrlOnlyJobListing(messages: ProcessInputStepArgs["messages"]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    return isUrlOnlyJobListingPaste(mastraMessageText(message));
  }
  return false;
}

export function latestUserTurnJobImportState(messages: ProcessInputStepArgs["messages"]): {
  urlOnly: boolean;
  sawExtract: boolean;
  sawPropose: boolean;
} {
  let afterLatestUser = false;
  let sawExtract = false;
  let sawPropose = false;
  let urlOnly = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawExtract = false;
      sawPropose = false;
      urlOnly = isUrlOnlyJobListingPaste(mastraMessageText(message));
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const name = mastraPartToolName(raw as Record<string, unknown>);
      if (isHubJobPageExtractToolName(name)) sawExtract = true;
      if (isProposeApplicationFromJdToolName(name)) sawPropose = true;
    }
  }
  return { urlOnly, sawExtract, sawPropose };
}

/**
 * After the latest user turn: extractor ran and propose-application-from-jd
 * has not been called. History from earlier turns is ignored.
 */
export function messagesNeedProposeAfterJobExtract(
  messages: ProcessInputStepArgs["messages"]
): boolean {
  const state = latestUserTurnJobImportState(messages);
  return state.sawExtract && !state.sawPropose;
}

/** URL-only paste or extract ran this turn, and the JD card has not been proposed. */
export function messagesNeedProposeAfterJobImport(
  messages: ProcessInputStepArgs["messages"]
): boolean {
  const state = latestUserTurnJobImportState(messages);
  if (state.sawPropose) return false;
  return state.sawExtract || state.urlOnly;
}

function mastraPartOutput(part: Record<string, unknown>): unknown {
  if (part.output != null) return part.output;
  const invocation = part.toolInvocation;
  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    return (invocation as { result?: unknown }).result;
  }
  return undefined;
}

function listNewJobsOutputHasRows(part: Record<string, unknown>): boolean {
  const output = mastraPartOutput(part);
  if (!output || typeof output !== "object" || Array.isArray(output)) return false;
  const jobs = (output as { jobs?: unknown }).jobs;
  return Array.isArray(jobs) && jobs.length > 0;
}

export function latestUserTurnTriageState(messages: ProcessInputStepArgs["messages"]): {
  sawList: boolean;
  listHasJobs: boolean;
  sawPropose: boolean;
} {
  let afterLatestUser = false;
  let sawList = false;
  let listHasJobs = false;
  let sawPropose = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawList = false;
      listHasJobs = false;
      sawPropose = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (isListNewJobsToolName(name)) {
        sawList = true;
        if (listNewJobsOutputHasRows(part)) listHasJobs = true;
      }
      if (isProposeNewJobsTriageToolName(name)) sawPropose = true;
    }
  }
  return { sawList, listHasJobs, sawPropose };
}

/** listNewJobs returned inbox rows this turn and the triage card is still missing. */
export function messagesNeedProposeTriage(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnTriageState(messages);
  return state.listHasJobs && !state.sawPropose;
}

export function latestUserTurnSearchBriefState(messages: ProcessInputStepArgs["messages"]): {
  sawBrief: boolean;
  hasTextAfter: boolean;
} {
  let afterLatestUser = false;
  let sawBrief = false;
  let hasTextAfter = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawBrief = false;
      hasTextAfter = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (isGetSearchBriefToolName(name) && mastraPartHasToolResult(part)) {
        sawBrief = true;
        hasTextAfter = false;
        continue;
      }
      if (sawBrief && part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        hasTextAfter = true;
      }
    }
    const text = mastraMessageText(message).trim();
    if (sawBrief && text.length > 0) hasTextAfter = true;
  }
  return { sawBrief, hasTextAfter };
}

function latestUserText(messages: ProcessInputStepArgs["messages"]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    return mastraMessageText(message);
  }
  return "";
}

/** Brief already loaded this turn — next step must be a spoken answer, not another tool. */
export function messagesNeedSearchBriefAnswer(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnSearchBriefState(messages);
  if (!state.sawBrief || state.hasTextAfter) return false;
  return searchBriefUserTurnNeedsSpokenAnswer(latestUserText(messages));
}

/** Latest user turn has a completed evidence or hard-stop confirm/cancel result. */
export function messagesHaveEvidenceOrHardStopResultThisTurn(
  messages: ProcessInputStepArgs["messages"]
): boolean {
  let afterLatestUser = false;
  let sawResult = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawResult = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (
        (isProposeEvidenceChangeToolName(name) || isProposeHardPreferenceChangeToolName(name)) &&
        mastraPartHasToolResult(part)
      ) {
        sawResult = true;
      }
    }
  }
  return sawResult;
}

/** True when a client HITL tool was called and has not received addToolOutput yet. */
export function mastraMessagesHavePendingClientHitl(
  messages: ProcessInputStepArgs["messages"]
): boolean {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (!isHubClientHitlToolName(name)) continue;
      if (mastraPartHasToolResult(part)) continue;
      return true;
    }
  }
  return false;
}

/**
 * Hub supervisor input processors (Mastra @mastra/core/processors).
 *
 * Order: personality, URL-import lock, last-step completion, ToolCallFilter,
 * then TokenLimiter so the final model context stays in budget.
 *
 * @see https://mastra.ai/docs/agents/processors
 */
/** Applies the user's chosen hub voice on the first step. */
export class HubPersonalityProcessor implements Processor {
  readonly id = "hub-personality";

  async processInputStep({ stepNumber, requestContext, sendSignal }: ProcessInputStepArgs) {
    if (stepNumber !== 0) return;
    const raw = requestContext?.get?.("hubPersonality");
    const preset = hubPersonalityById(typeof raw === "string" ? raw : "cairo");
    await sendSignal?.({
      type: "reactive",
      contents: preset.prompt,
      attributes: { reason: "hub-personality", personality: preset.id }
    });
  }
}

/**
 * URL-only listing paste: extract is a silent prelude; the JD card is the UI.
 * After extract (or on first step of a listing URL), force the propose tool.
 */
export class HubJobUrlImportProcessor implements Processor {
  readonly id = "hub-job-url-import";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;

    const state = latestUserTurnJobImportState(messages);
    if (state.sawPropose) return;
    if (!state.sawExtract && !state.urlOnly) return;

    await sendSignal?.({
      type: "reactive",
      contents: hubJobUrlImportFeedback(state.sawExtract),
      attributes: {
        reason: state.sawExtract ? "job-extract-must-propose" : "job-url-import"
      }
    });

    const activeTools = filterHubJobUrlImportActiveTools(
      tools ? Object.keys(tools) : [],
      state.sawExtract
    );
    return {
      toolChoice: "required" as const,
      ...(activeTools.length > 0 ? { activeTools } : {})
    };
  }
}

/**
 * After listNewJobs returns inbox rows, the triage card is the UI.
 * Production models otherwise write a markdown table instead of the HITL tool.
 */
export class HubNewJobsTriageProcessor implements Processor {
  readonly id = "hub-new-jobs-triage";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedProposeTriage(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_TRIAGE_MUST_PROPOSE_FEEDBACK,
      attributes: { reason: "list-new-jobs-must-triage" }
    });

    const activeTools = filterHubTriageActiveTools(tools ? Object.keys(tools) : []);
    return {
      toolChoice: "required" as const,
      ...(activeTools.length > 0 ? { activeTools } : {})
    };
  }
}

/**
 * After getSearchBrief, the File Diff is on screen. Force a spoken answer
 * (where did the intro go?) instead of another tool or an empty turn.
 */
export class HubSearchBriefAnswerProcessor implements Processor {
  readonly id = "hub-search-brief-answer";

  async processInputStep({ messages, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedSearchBriefAnswer(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_SEARCH_BRIEF_MUST_ANSWER_FEEDBACK,
      attributes: { reason: "search-brief-must-answer" }
    });

    return { toolChoice: "none" as const };
  }
}

/**
 * After evidence or hard-stop confirm: drop listNewJobs / triage / findJobsNow
 * so auto-resume interviews the next entity instead of reopening the inbox.
 */
export class HubPostEvidenceConfirmProcessor implements Processor {
  readonly id = "hub-post-evidence-confirm";

  async processInputStep({ messages, tools }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesHaveEvidenceOrHardStopResultThisTurn(messages)) return;

    const activeTools = filterHubPostEvidenceConfirmActiveTools(tools ? Object.keys(tools) : []);
    return activeTools.length > 0 ? { activeTools } : {};
  }
}

export function createHubInputProcessors(maxSteps: number = HUB_SUPERVISOR_MAX_STEPS) {
  return [
    new HubPersonalityProcessor(),
    new HubJobUrlImportProcessor(),
    new HubNewJobsTriageProcessor(),
    new HubPostEvidenceConfirmProcessor(),
    new HubSearchBriefAnswerProcessor(),
    new HubEnsureFinalResponseProcessor(maxSteps),
    // Keep enough recent tool-producing steps for superpowers multi-tool
    // chains (listNewJobs + evidence lists + propose → writes). filterAfter=2
    // dropped listNewJobs results before proposeNewJobsTriage and caused empty
    // triage thrash. Detect/organize dumps are still truncated by TokenLimiter.
    new ToolCallFilter({
      filterAfterToolSteps: 8,
      preserveModelOutput: true
    }),
    // Safety net after memory + tool filtering (~100k input budget for BYO models).
    new TokenLimiter(100_000)
  ];
}
