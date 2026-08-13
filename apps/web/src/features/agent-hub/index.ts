export { HUB_AUI_SUGGESTIONS, HUB_SUGGESTIONS } from "./api/hub-suggestions";
export type { HubSuggestion } from "./api/hub-suggestions";
export {
  HUB_AGENT_ID,
  useHubChat,
  type HubChatContextValue,
  type HubToolApprovalResponseArgs,
  type HubToolOutputArgs
} from "./api/use-hub-chat";
export { HubChatProvider } from "./ui/hub-chat-provider";
export { hubAssistantAuiConfig, hubAssistantToolkit } from "./ui/hub-assistant-toolkit";
export {
  ApplicationFromJdCard,
  PROPOSE_FROM_JD_CHOICE_LABELS
} from "./ui/application-from-jd-card";
export type {
  ApplicationFromJdCardAction,
  ApplicationFromJdCardInput,
  ApplicationFromJdCardProps
} from "./ui/application-from-jd-card";
export { AgentHubToolApproval } from "./ui/agent-hub-tool-approval";
export {
  findPendingProposeApplicationFromJd,
  hubToolNameFromPart,
  HUB_GENERATE_APPLY_PACKAGE_TOOL_NAMES,
  HUB_PROPOSE_APPLICATION_FROM_JD_TOOL_NAMES,
  isGenerateApplyPackageToolName,
  isHubToolUiPart,
  isProposeApplicationFromJdToolName,
  parseProposeApplicationFromJdInput,
  parseProposeApplicationFromJdOutputAction
} from "./lib/hub-tool-names";
export type {
  HubToolNamePart,
  PendingProposeApplicationFromJd,
  ProposeApplicationFromJdAction,
  ProposeApplicationFromJdCardInput
} from "./lib/hub-tool-names";
export {
  useListSuspendedRunsQuery,
  listSuspendedRunsQueryOptions
} from "./api/list-suspended-runs.query";
export type { SuspendedRun } from "./api/list-suspended-runs.query";
export {
  useListHubMessagesQuery,
  listHubMessagesQueryOptions,
  listHubMessagesQueryKeys,
  fetchHubMessagesPage,
  HUB_MESSAGES_PAGE_SIZE
} from "./api/list-hub-messages.query";
export type {
  HubMessagesPageResult,
  ListHubMessagesQueryResult
} from "./api/list-hub-messages.query";
export {
  collapseConsecutiveTextParts,
  filterTextWhileStreaming
} from "./lib/collapse-consecutive-text-parts";
export { messageCreatedAt, formatHubDayLabel, formatHubTimeLabel } from "./lib/hub-ui-message-time";
export {
  createHubThreadHistoryAdapter,
  mapUiMessagesToHistoryItems,
  prependUniqueHubMessages
} from "./lib/hub-thread-history-adapter";
export type { HubHistoryPage, HubHistoryItem } from "./lib/hub-thread-history-adapter";
export type { CollapseMessagePart } from "./lib/collapse-consecutive-text-parts";
export {
  HUB_CLIENT_RESUME_TOOL_NAMES,
  lastAssistantMessageIsCompleteWithClientResumeTools,
  shouldAutoResumeHubChat
} from "./lib/should-auto-resume-hub-chat";
export { messagesForMastraMemoryChat } from "./lib/messages-for-mastra-memory";
export { parseAiError, parseHubChatError, presentAiError } from "@/shared/lib/parse-ai-error";
export type {
  AiErrorFeature,
  AiErrorKind,
  AiErrorPresentation,
  AiErrorSeverity,
  HubChatErrorKind,
  HubChatErrorPresentation
} from "@/shared/lib/parse-ai-error";
