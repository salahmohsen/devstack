import {
  TokenLimiter,
  ToolCallFilter,
  type ProcessInputStepArgs,
  type ProcessOutputResultArgs,
  type Processor
} from "@mastra/core/processors";

import {
  APPLICATION_MENTION_RE,
  hubPersonalityById,
  searchBriefUserTurnNeedsSpokenAnswer
} from "@tsu-stack/core";

import {
  filterHubJobUrlImportActiveTools,
  filterHubPostEvidenceConfirmActiveTools,
  filterHubPostTriageConfirmActiveTools,
  filterHubTriageActiveTools,
  HUB_TRIAGE_MUST_PROPOSE_FEEDBACK,
  HUB_TRIAGE_MUST_WRITE_FEEDBACK,
  hubJobUrlImportFeedback,
  HUB_APPLICATION_MUST_LOAD_FEEDBACK,
  HUB_SEARCH_BRIEF_MUST_ANSWER_FEEDBACK,
  HUB_TODAY_MUST_GATHER_FEEDBACK,
  HUB_STACKS_MUST_LIST_FEEDBACK,
  filterHubUnionForcedReadActiveTools,
  shouldForceProposeApplicationFromJd,
  shouldStopHubLoopAfterClientHitl,
  type HubForcedReadFlags,
  isDismissJobToolName,
  isGetApplicationToolName,
  isGetDailyBriefToolName,
  isListStacksToolName,
  isOpenDailyBriefToolName,
  isGetSearchBriefToolName,
  userTurnAsksDailyBrief,
  userTurnAsksStackCatalog,
  userTurnAsksSearchBrief,
  userTurnRetriesStackCatalog,
  userTurnAsksPileStatusOnly,
  userTurnAsksCompanyStatus,
  userTurnAsksEntityInspect,
  userTurnRetriesDailyBrief,
  HUB_COMPANY_MUST_READ_FEEDBACK,
  HUB_SEARCH_BRIEF_MUST_LOAD_FEEDBACK,
  isHubClientHitlToolName,
  isOpenEntityInspectToolName,
  HUB_INSPECT_MUST_OPEN_FEEDBACK,
  isHubJobPageExtractToolName,
  isListNewJobsToolName,
  isProposeApplicationFromJdToolName,
  isHubPostEvidenceLikeConfirmToolName,
  isProposeNewJobsTriageToolName,
  isTrackJobToolName,
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
      messagesNeedTriageWrites(messages) ||
      messagesNeedSearchBriefAnswer(messages) ||
      messagesNeedGetSearchBrief(messages) ||
      messagesNeedGetApplication(messages) ||
      messagesNeedDailyBriefFacts(messages) ||
      messagesNeedDailyBriefOpen(messages) ||
      messagesNeedListStacks(messages)
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

/** ActiveTools exclusive filters return "Tool X not found" as a string result. */
function mastraPartToolResultValue(part: Record<string, unknown>): unknown {
  if (part.output != null) return part.output;
  const invocation = part.toolInvocation;
  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    return (invocation as { result?: unknown }).result;
  }
  return undefined;
}

export function mastraPartHasSuccessfulToolResult(part: Record<string, unknown>): boolean {
  if (!mastraPartHasToolResult(part)) return false;
  if (typeof part.state === "string" && part.state === "output-error") return false;
  const value = mastraPartToolResultValue(part);
  if (typeof value === "string" && /tool\s+["']?[\w-]+["']?\s+not found/i.test(value)) {
    return false;
  }
  if (typeof value === "string" && /available tools:/i.test(value) && /not found/i.test(value)) {
    return false;
  }
  return true;
}

function hubForcedReadFlags(messages: ProcessInputStepArgs["messages"]): HubForcedReadFlags {
  return {
    today: messagesNeedDailyBriefFacts(messages),
    stacks: messagesNeedListStacks(messages),
    searchBrief: messagesNeedGetSearchBrief(messages),
    company: messagesNeedCompanyRead(messages),
    inspect: messagesNeedEntityInspect(messages),
    application: messagesNeedGetApplication(messages)
  };
}

function hubForcedReadActiveTools(
  tools: ProcessInputStepArgs["tools"],
  messages: ProcessInputStepArgs["messages"]
): string[] {
  const names = tools ? Object.keys(tools) : [];
  return filterHubUnionForcedReadActiveTools(names, hubForcedReadFlags(messages));
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

function mastraPartInput(part: Record<string, unknown>): unknown {
  if (part.input != null) return part.input;
  if (part.args != null) return part.args;
  const invocation = part.toolInvocation;
  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    const inv = invocation as { args?: unknown; input?: unknown };
    return inv.args ?? inv.input;
  }
  return undefined;
}

function applicationIdFromPart(part: Record<string, unknown>): string | null {
  const input = mastraPartInput(part);
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const id = (input as { applicationId?: unknown }).applicationId;
    if (typeof id === "string" && id.length > 0) return id;
  }
  const output = mastraPartOutput(part);
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const id = (output as { applicationId?: unknown }).applicationId;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

function proposeTriageOutput(part: Record<string, unknown>): {
  action: "confirm" | "cancel";
  trackIds: string[];
  dismissIds: string[];
} | null {
  const output = mastraPartOutput(part);
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const o = output as { action?: unknown; trackIds?: unknown; dismissIds?: unknown };
  if (o.action !== "confirm" && o.action !== "cancel") return null;
  return {
    action: o.action,
    trackIds: Array.isArray(o.trackIds)
      ? o.trackIds.filter((id): id is string => typeof id === "string")
      : [],
    dismissIds: Array.isArray(o.dismissIds)
      ? o.dismissIds.filter((id): id is string => typeof id === "string")
      : []
  };
}

export function latestUserTurnTriageState(messages: ProcessInputStepArgs["messages"]): {
  sawList: boolean;
  listHasJobs: boolean;
  sawPropose: boolean;
  confirmAction: "confirm" | "cancel" | null;
  confirmTrackIds: string[];
  confirmDismissIds: string[];
  writtenTrackIds: string[];
  writtenDismissIds: string[];
} {
  let afterLatestUser = false;
  let sawList = false;
  let listHasJobs = false;
  let sawPropose = false;
  let confirmAction: "confirm" | "cancel" | null = null;
  let confirmTrackIds: string[] = [];
  let confirmDismissIds: string[] = [];
  const writtenTrack = new Set<string>();
  const writtenDismiss = new Set<string>();
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawList = false;
      listHasJobs = false;
      sawPropose = false;
      confirmAction = null;
      confirmTrackIds = [];
      confirmDismissIds = [];
      writtenTrack.clear();
      writtenDismiss.clear();
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
      if (isProposeNewJobsTriageToolName(name)) {
        sawPropose = true;
        const output = proposeTriageOutput(part);
        if (output && confirmAction == null) {
          confirmAction = output.action;
          confirmTrackIds = output.trackIds;
          confirmDismissIds = output.dismissIds;
        }
      }
      if (isTrackJobToolName(name)) {
        const id = applicationIdFromPart(part);
        if (id) writtenTrack.add(id);
      }
      if (isDismissJobToolName(name)) {
        const id = applicationIdFromPart(part);
        if (id) writtenDismiss.add(id);
      }
    }
  }
  return {
    sawList,
    listHasJobs,
    sawPropose,
    confirmAction,
    confirmTrackIds,
    confirmDismissIds,
    writtenTrackIds: [...writtenTrack],
    writtenDismissIds: [...writtenDismiss]
  };
}

/** listNewJobs returned inbox rows this turn and the triage card is still missing. */
export function messagesNeedProposeTriage(messages: ProcessInputStepArgs["messages"]): boolean {
  if (userTurnAsksPileStatusOnly(latestUserText(messages))) return false;
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
      if (isGetSearchBriefToolName(name) && mastraPartHasSuccessfulToolResult(part)) {
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

function recentUserAskedDailyBrief(messages: ProcessInputStepArgs["messages"]): boolean {
  let seenUsers = 0;
  for (let i = messages.length - 1; i >= 0 && seenUsers < 5; i--) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    seenUsers += 1;
    const text = mastraMessageText(message);
    if (userTurnAsksDailyBrief(text)) return true;
    if (!userTurnRetriesDailyBrief(text)) return false;
  }
  return false;
}

function messagesAfterLatestUser(messages: ProcessInputStepArgs["messages"]) {
  let start = 0;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role === "user") start = i + 1;
  }
  return messages.slice(start);
}

export function latestUserTurnTodayState(messages: ProcessInputStepArgs["messages"]): {
  asked: boolean;
  sawFacts: boolean;
  sawOpen: boolean;
} {
  const latest = latestUserText(messages);
  const asked =
    userTurnAsksDailyBrief(latest) ||
    (userTurnRetriesDailyBrief(latest) && recentUserAskedDailyBrief(messages));
  let afterLatestUser = false;
  let sawFacts = false;
  let sawOpen = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawFacts = false;
      sawOpen = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (isGetDailyBriefToolName(name) && mastraPartHasSuccessfulToolResult(part)) sawFacts = true;
      if (isOpenDailyBriefToolName(name)) sawOpen = true;
    }
  }
  return { asked, sawFacts, sawOpen };
}

export function messagesNeedDailyBriefFacts(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnTodayState(messages);
  return state.asked && !state.sawFacts && !state.sawOpen;
}

function recentUserAskedStackCatalog(messages: ProcessInputStepArgs["messages"]): boolean {
  let seenUsers = 0;
  for (let i = messages.length - 1; i >= 0 && seenUsers < 5; i--) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    seenUsers += 1;
    const text = mastraMessageText(message);
    if (userTurnAsksStackCatalog(text)) return true;
    if (!userTurnRetriesStackCatalog(text)) return false;
  }
  return false;
}

export function latestUserTurnStackCatalogState(messages: ProcessInputStepArgs["messages"]): {
  asked: boolean;
  sawList: boolean;
  hasSpokenAfter: boolean;
} {
  const latest = latestUserText(messages);
  const asked =
    userTurnAsksStackCatalog(latest) ||
    (userTurnRetriesStackCatalog(latest) && recentUserAskedStackCatalog(messages));
  let afterLatestUser = false;
  let sawList = false;
  let hasSpokenAfter = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawList = false;
      hasSpokenAfter = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (isListStacksToolName(name) && mastraPartHasSuccessfulToolResult(part)) {
        sawList = true;
        continue;
      }
      if (sawList && part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        hasSpokenAfter = true;
      }
    }
  }
  return { asked, sawList, hasSpokenAfter };
}

export function messagesNeedListStacks(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnStackCatalogState(messages);
  return state.asked && !state.sawList;
}

export function shouldStopAfterStackCatalog(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnStackCatalogState(messages);
  if (!state.asked || !state.sawList) return false;
  if (
    messagesNeedDailyBriefFacts(messages) ||
    messagesNeedEntityInspect(messages) ||
    messagesNeedGetSearchBrief(messages) ||
    messagesNeedCompanyRead(messages) ||
    messagesNeedGetApplication(messages)
  ) {
    return false;
  }
  return state.hasSpokenAfter;
}

/** Search brief not loaded yet this turn for a rules / looking-for ask. */
export function messagesNeedGetSearchBrief(messages: ProcessInputStepArgs["messages"]): boolean {
  if (!userTurnAsksSearchBrief(latestUserText(messages))) return false;
  return !latestUserTurnSearchBriefState(messages).sawBrief;
}

/** Latest user turn contains `application {id}` and getApplication has not succeeded yet. */
export function messagesNeedGetApplication(messages: ProcessInputStepArgs["messages"]): boolean {
  if (!APPLICATION_MENTION_RE.test(latestUserText(messages))) return false;
  for (const message of messagesAfterLatestUser(messages)) {
    if (message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (isGetApplicationToolName(name) && mastraPartHasSuccessfulToolResult(part)) {
        return false;
      }
    }
  }
  return true;
}

export function messagesNeedDailyBriefOpen(messages: ProcessInputStepArgs["messages"]): boolean {
  // Panel opens from getDailyBrief on the client. Do not keep the supervisor
  // looping on openDailyBrief ("Still here" / "Hey" until the tool finally runs).
  void messages;
  return false;
}

/** Today-only ask already has the letter — stop instead of another idle step. */
export function shouldStopAfterTodayLetter(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnTodayState(messages);
  if (!state.asked || !state.sawFacts) return false;
  if (
    messagesNeedEntityInspect(messages) ||
    messagesNeedCompanyRead(messages) ||
    messagesNeedListStacks(messages) ||
    messagesNeedGetSearchBrief(messages) ||
    messagesNeedGetApplication(messages)
  ) {
    return false;
  }
  return true;
}

export function messagesNeedCompanyRead(messages: ProcessInputStepArgs["messages"]): boolean {
  if (!userTurnAsksCompanyStatus(latestUserText(messages))) return false;
  for (const message of messagesAfterLatestUser(messages)) {
    if (message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const name = mastraPartToolName(raw as Record<string, unknown>);
      if (/searchApplications|search-applications|searchMail|search-mail/i.test(name)) return false;
    }
  }
  return true;
}

export function messagesNeedEntityInspect(messages: ProcessInputStepArgs["messages"]): boolean {
  if (!userTurnAsksEntityInspect(latestUserText(messages))) return false;
  let afterLatestUser = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const name = mastraPartToolName(raw as Record<string, unknown>);
      if (isOpenEntityInspectToolName(name)) return false;
    }
  }
  return true;
}

/** Brief already loaded this turn — next step must be a spoken answer, not another tool. */
export function messagesNeedSearchBriefAnswer(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnSearchBriefState(messages);
  if (!state.sawBrief || state.hasTextAfter) return false;
  return searchBriefUserTurnNeedsSpokenAnswer(latestUserText(messages));
}

/** Confirm already landed this turn and track/dismiss writes are still outstanding. */
export function messagesNeedTriageWrites(messages: ProcessInputStepArgs["messages"]): boolean {
  const state = latestUserTurnTriageState(messages);
  if (state.confirmAction !== "confirm") return false;
  const writtenTrack = new Set(state.writtenTrackIds);
  const writtenDismiss = new Set(state.writtenDismissIds);
  const remainingTrack = state.confirmTrackIds.some((id) => !writtenTrack.has(id));
  const remainingDismiss = state.confirmDismissIds.some((id) => !writtenDismiss.has(id));
  return remainingTrack || remainingDismiss;
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
      if (isHubPostEvidenceLikeConfirmToolName(name) && mastraPartHasToolResult(part)) {
        sawResult = true;
      }
    }
  }
  return sawResult;
}

/** True when a client HITL tool on **this** user turn still lacks addToolOutput. */
export function mastraMessagesHavePendingClientHitl(
  messages: ProcessInputStepArgs["messages"]
): boolean {
  for (const message of messagesAfterLatestUser(messages)) {
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
    // Do not set toolChoice "required" — DeepSeek thinking models 400
    // ("Thinking mode does not support this tool_choice").
    return activeTools.length > 0 ? { activeTools } : {};
  }
}

/**
 * After Confirm: only trackJob / dismissJob. A second propose this turn is the
 * confirm-loop bug (two receipts + Generating).
 */
/**
 * After getSearchBrief, the File Diff is on screen. Force a spoken answer
 * (where did the intro go?) instead of another tool or an empty turn.
 */
export class HubCompanyStatusProcessor implements Processor {
  readonly id = "hub-company-status";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedCompanyRead(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_COMPANY_MUST_READ_FEEDBACK,
      attributes: { reason: "company-must-read" }
    });
    const activeTools = hubForcedReadActiveTools(tools, messages);
    return activeTools.length > 0 ? { activeTools } : {};
  }
}

export class HubInspectProcessor implements Processor {
  readonly id = "hub-inspect";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedEntityInspect(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_INSPECT_MUST_OPEN_FEEDBACK,
      attributes: { reason: "inspect-must-open" }
    });
    const activeTools = hubForcedReadActiveTools(tools, messages);
    return activeTools.length > 0 ? { activeTools } : {};
  }
}

export class HubStackCatalogProcessor implements Processor {
  readonly id = "hub-stack-catalog";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedListStacks(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_STACKS_MUST_LIST_FEEDBACK,
      attributes: { reason: "stacks-must-list" }
    });
    const activeTools = hubForcedReadActiveTools(tools, messages);
    return {
      toolChoice: "required" as const,
      ...(activeTools.length > 0 ? { activeTools } : {})
    };
  }
}

export class HubTodayProcessor implements Processor {
  readonly id = "hub-today";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;

    if (messagesNeedDailyBriefFacts(messages)) {
      await sendSignal?.({
        type: "reactive",
        contents: HUB_TODAY_MUST_GATHER_FEEDBACK,
        attributes: { reason: "today-must-gather" }
      });
      const activeTools = hubForcedReadActiveTools(tools, messages);
      return {
        toolChoice: "required" as const,
        ...(activeTools.length > 0 ? { activeTools } : {})
      };
    }
  }
}

export class HubSearchBriefGatherProcessor implements Processor {
  readonly id = "hub-search-brief-gather";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedGetSearchBrief(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_SEARCH_BRIEF_MUST_LOAD_FEEDBACK,
      attributes: { reason: "search-brief-must-load" }
    });
    const activeTools = hubForcedReadActiveTools(tools, messages);
    return {
      toolChoice: "required" as const,
      ...(activeTools.length > 0 ? { activeTools } : {})
    };
  }
}

export class HubApplicationMentionProcessor implements Processor {
  readonly id = "hub-application-mention";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedGetApplication(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_APPLICATION_MUST_LOAD_FEEDBACK,
      attributes: { reason: "application-must-load" }
    });
    const activeTools = hubForcedReadActiveTools(tools, messages);
    return {
      toolChoice: "required" as const,
      ...(activeTools.length > 0 ? { activeTools } : {})
    };
  }
}

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

export class HubPostTriageConfirmProcessor implements Processor {
  readonly id = "hub-post-triage-confirm";

  async processInputStep({ messages, tools, sendSignal }: ProcessInputStepArgs) {
    if (mastraMessagesHavePendingClientHitl(messages)) return;
    if (!messagesNeedTriageWrites(messages)) return;

    await sendSignal?.({
      type: "reactive",
      contents: HUB_TRIAGE_MUST_WRITE_FEEDBACK,
      attributes: { reason: "triage-confirm-must-write" }
    });

    const activeTools = filterHubPostTriageConfirmActiveTools(tools ? Object.keys(tools) : []);
    return activeTools.length > 0 ? { activeTools } : {};
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

/** Stamp the active voice onto persisted assistant messages. */
export class HubPersonalityPersistProcessor implements Processor {
  readonly id = "hub-personality-persist";

  async processOutputResult({ messages, requestContext }: ProcessOutputResultArgs) {
    const raw = requestContext?.get?.("hubPersonality");
    const personality = hubPersonalityById(typeof raw === "string" ? raw : undefined).id;
    return messages.map((message) => {
      if (message.role !== "assistant") return message;
      const content = message.content;
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        return message;
      }
      const existing =
        "metadata" in content && content.metadata && typeof content.metadata === "object"
          ? (content.metadata as Record<string, unknown>)
          : {};
      if (existing.hubPersonality === personality) return message;
      return {
        ...message,
        content: {
          ...content,
          metadata: { ...existing, hubPersonality: personality }
        }
      };
    });
  }
}

export function createHubOutputProcessors() {
  return [new HubPersonalityPersistProcessor()];
}

export function createHubInputProcessors(maxSteps: number = HUB_SUPERVISOR_MAX_STEPS) {
  return [
    new HubPersonalityProcessor(),
    new HubTodayProcessor(),
    new HubStackCatalogProcessor(),
    new HubSearchBriefGatherProcessor(),
    new HubApplicationMentionProcessor(),
    new HubCompanyStatusProcessor(),
    new HubInspectProcessor(),
    new HubJobUrlImportProcessor(),
    new HubNewJobsTriageProcessor(),
    new HubPostTriageConfirmProcessor(),
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

export type HubSupervisorIterationCtx = {
  messages: ProcessInputStepArgs["messages"];
  toolCalls?: Array<{ id: string; name: string }>;
  toolResults?: Array<{ id: string }>;
  text?: string;
  iteration: number;
  finishReason?: string;
};

export function hubSupervisorOnIterationComplete(ctx: HubSupervisorIterationCtx): {
  continue: boolean;
  feedback?: string;
} {
  const toolCalls = ctx.toolCalls ?? [];
  const toolResults = ctx.toolResults ?? [];
  if (
    shouldStopHubLoopAfterClientHitl({ toolCalls, toolResults }) ||
    mastraMessagesHavePendingClientHitl(ctx.messages)
  ) {
    return { continue: false };
  }
  const toolNames = toolCalls.map((call) => call.name);
  if (
    shouldForceProposeApplicationFromJd(toolNames) ||
    messagesNeedProposeAfterJobImport(ctx.messages)
  ) {
    return {
      continue: true,
      feedback: hubJobUrlImportFeedback(
        shouldForceProposeApplicationFromJd(toolNames) ||
          messagesNeedProposeAfterJobExtract(ctx.messages)
      )
    };
  }
  if (messagesNeedProposeTriage(ctx.messages)) {
    return { continue: true, feedback: HUB_TRIAGE_MUST_PROPOSE_FEEDBACK };
  }
  if (messagesNeedTriageWrites(ctx.messages)) {
    return { continue: true, feedback: HUB_TRIAGE_MUST_WRITE_FEEDBACK };
  }
  if (messagesNeedSearchBriefAnswer(ctx.messages)) {
    return { continue: true, feedback: HUB_SEARCH_BRIEF_MUST_ANSWER_FEEDBACK };
  }
  const toolCount = toolCalls.length;
  const textOnly = toolCount === 0 && Boolean(ctx.text?.trim());
  // iteration is 1-based. Allow one force-feedback retry, then stop so
  // text-only "pulling it now" history contamination cannot maxSteps-spam.
  const pastFirstForceRetry = ctx.iteration >= 2;
  if (messagesNeedDailyBriefFacts(ctx.messages)) {
    if (textOnly && pastFirstForceRetry) {
      return { continue: false };
    }
    return { continue: true, feedback: HUB_TODAY_MUST_GATHER_FEEDBACK };
  }
  if (messagesNeedListStacks(ctx.messages)) {
    if (textOnly && pastFirstForceRetry) {
      return { continue: false };
    }
    return { continue: true, feedback: HUB_STACKS_MUST_LIST_FEEDBACK };
  }
  if (messagesNeedGetSearchBrief(ctx.messages)) {
    if (textOnly && pastFirstForceRetry) {
      return { continue: false };
    }
    return { continue: true, feedback: HUB_SEARCH_BRIEF_MUST_LOAD_FEEDBACK };
  }
  if (messagesNeedEntityInspect(ctx.messages)) {
    if (textOnly && pastFirstForceRetry) {
      return { continue: false };
    }
    return { continue: true, feedback: HUB_INSPECT_MUST_OPEN_FEEDBACK };
  }
  if (messagesNeedCompanyRead(ctx.messages)) {
    if (textOnly && pastFirstForceRetry) {
      return { continue: false };
    }
    return { continue: true, feedback: HUB_COMPANY_MUST_READ_FEEDBACK };
  }
  if (messagesNeedGetApplication(ctx.messages)) {
    if (textOnly && pastFirstForceRetry) {
      return { continue: false };
    }
    return { continue: true, feedback: HUB_APPLICATION_MUST_LOAD_FEEDBACK };
  }
  if (shouldStopAfterTodayLetter(ctx.messages)) {
    return { continue: false };
  }
  if (shouldStopAfterStackCatalog(ctx.messages)) {
    return { continue: false };
  }
  if (toolCount === 0 && (ctx.finishReason === "stop" || Boolean(ctx.text?.trim()))) {
    return { continue: false };
  }
  return { continue: true };
}
