export { HUB_SUGGESTIONS } from "./api/hub-suggestions";
export type { HubSuggestion } from "./api/hub-suggestions";
export {
  HUB_AGENT_ID,
  useHubChat,
  type HubChatContextValue,
  type HubToolApprovalResponseArgs,
  type HubToolOutputArgs
} from "./api/use-hub-chat";
export { HubChatProvider } from "./ui/hub-chat-provider";
export {
  useListSuspendedRunsQuery,
  listSuspendedRunsQueryOptions
} from "./api/list-suspended-runs.query";
export type { SuspendedRun } from "./api/list-suspended-runs.query";
export {
  useListHubMessagesQuery,
  listHubMessagesQueryOptions
} from "./api/list-hub-messages.query";
export {
  collapseConsecutiveTextParts,
  filterTextWhileStreaming
} from "./lib/collapse-consecutive-text-parts";
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
