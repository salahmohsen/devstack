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
export {
  consumeHubCreateIntent,
  consumeOpenHubAssistant,
  getHubAssistantOpenPending,
  getHubCreateIntent,
  hubCreateInterviewText,
  requestHubCreateInterview,
  requestOpenHubAssistant,
  subscribeHubAssistantOpen,
  subscribeHubCreateIntent
} from "./lib/hub-assistant-open";
export type { HubCreateIntent } from "./lib/hub-assistant-open";
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
  lastHubHitlKind,
  hubToolNameFromPart,
  HUB_ACCEPT_APPLY_PACKAGE_TOOL_NAMES,
  HUB_GENERATE_APPLY_PACKAGE_TOOL_NAMES,
  HUB_GET_EXPERIENCE_TOOL_NAMES,
  HUB_LIST_EXPERIENCES_TOOL_NAMES,
  HUB_FIND_JOBS_NOW_TOOL_NAMES,
  HUB_GET_DAILY_BRIEF_TOOL_NAMES,
  HUB_OPEN_DAILY_BRIEF_TOOL_NAMES,
  HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES,
  HUB_GET_SEARCH_BRIEF_TOOL_NAMES,
  HUB_OPEN_ENTITY_FORM_TOOL_NAMES,
  HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES,
  HUB_OPEN_SURFACE_TOOL_NAMES,
  HUB_PROPOSE_APPLICATION_FROM_JD_TOOL_NAMES,
  HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES,
  HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES,
  HUB_SEND_APPLY_OUTREACH_TOOL_NAMES,
  isAcceptApplyPackageToolName,
  isGenerateApplyPackageToolName,
  isHubApprovalToolName,
  isHubToolUiPart,
  isFindJobsNowToolName,
  isGetDailyBriefToolName,
  isOpenDailyBriefToolName,
  isProposeMailCrmChangeToolName,
  isGetSearchBriefToolName,
  isOpenEntityFormToolName,
  isOpenEntityInspectToolName,
  isOpenSurfaceToolName,
  isProposeApplicationFromJdToolName,
  isProposeHardPreferenceChangeToolName,
  isProposeNewJobsTriageToolName,
  isSendApplyOutreachToolName,
  findOpenEntityFormOutputInMessages,
  parseOpenEntityFormInput,
  parseOpenEntityFormOutput,
  parseOpenEntityInspectInput,
  parseOpenEntityInspectOutput,
  pendingOpenEntityFormIds,
  shouldRequestEntityFormHost,
  parseOpenSurfaceHref,
  parseProposeApplicationFromJdInput,
  parseProposeApplicationFromJdOutputAction,
  parseProposeNewJobsTriageInput,
  parseProposeNewJobsTriageOutput
} from "./lib/hub-tool-names";
export type {
  HubToolNamePart,
  PendingProposeApplicationFromJd,
  ProposeApplicationFromJdAction,
  ProposeApplicationFromJdCardInput,
  OpenEntityFormInput,
  OpenEntityFormKind,
  OpenEntityFormOutput,
  OpenEntityInspectInput,
  OpenEntityInspectOutput,
  ProposeNewJobsTriageCardInput
} from "./lib/hub-tool-names";
export { NewJobsTriageCard } from "./ui/new-jobs-triage-card";
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
export { messageCreatedAt, formatHubDayLabel, formatHubTimeLabel } from "./lib/hub-ui-message-time";
export { buildHubDayRows } from "./lib/hub-day-rows";
export type { HubDayRow } from "./lib/hub-day-rows";
export {
  createHubThreadHistoryAdapter,
  hubHistoryExportedRepository,
  hubHistoryHasBranches,
  hubHistoryHeadPath,
  isPureTextHubAssistantReply,
  isToolBearingHubAssistant,
  mapUiMessagesToHistoryItems,
  prependUniqueHubMessages,
  unionHubMessages
} from "./lib/hub-thread-history-adapter";
export type { HubHistoryPage, HubHistoryItem } from "./lib/hub-thread-history-adapter";
export { HubFollowupSuggestions } from "./ui/hub-follow-up-suggestions";
export { HubAssistantMessage } from "./ui/hub-assistant-message";
export { HubUserMessage } from "./ui/hub-user-message";
export { HubComposerModelPicker } from "./ui/hub-composer-model-picker";
export { HubComposerPersonalityPicker } from "./ui/hub-composer-personality-picker";
export { HubComposerDirectiveChip } from "./ui/hub-composer-directive-chip";
export {
  getHubComposerPersonality,
  setHubComposerPersonality,
  subscribeHubComposerPersonality
} from "./lib/hub-composer-personality";
export { HUB_SLASH_COMMAND_META, HUB_TOOL_MENTIONS } from "./lib/hub-composer-triggers";
export type { HubSlashCommandId, HubToolMention } from "./lib/hub-composer-triggers";
export { useStartNewHubChatMutation } from "./api/start-new-hub-chat.mutation";
export {
  HUB_CLIENT_RESUME_TOOL_NAMES,
  hideHubAssistantTextAfterIndex,
  lastAssistantMessageIsCompleteWithClientResumeTools,
  shouldAutoResumeHubChat
} from "./lib/should-auto-resume-hub-chat";
export {
  approveEntityFormCall,
  clearEntityFormRequest,
  dismissEntityFormCalls,
  isEntityFormCallApproved,
  isEntityFormCallDismissed,
  requestEntityForm,
  useEntityFormHostActive,
  useEntityFormHostSelector
} from "./lib/entity-form-host-store";
export type { EntityFormHostRequest, EntityFormKind } from "./lib/entity-form-host-store";
export {
  clearEntityInspectRequest,
  requestEntityInspect,
  useEntityInspectHostActive,
  useEntityInspectHostSelector,
  useEntityPanelHostActive
} from "./lib/entity-inspect-host-store";
export type { EntityInspectHostRequest } from "./lib/entity-inspect-host-store";
export {
  clearDailyBriefRequest,
  requestDailyBrief,
  useDailyBriefHostActive,
  useDailyBriefHostSelector
} from "./lib/daily-brief-host-store";
export type { DailyBriefHostRequest } from "./lib/daily-brief-host-store";
export {
  cancelOutputForHubHitl,
  isHubConfirmHitlToolName,
  staleWaitingHubConfirmCards,
  toolCallIsOnLatestAssistant,
  waitingHubConfirmCards
} from "./lib/cancel-stale-hub-hitl";
export type { WaitingHubHitl } from "./lib/cancel-stale-hub-hitl";
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
