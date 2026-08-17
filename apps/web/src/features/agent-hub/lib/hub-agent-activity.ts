import {
  type AgentActivityItem,
  type AgentActivityStatus,
  type AgentStepStatus
} from "@/shared/ui/agents/agent-activity";

import { hubSubagentListShouldShow, isHubSubagentWorkerName } from "./hub-subagent-workers";
import {
  hubToolNameFromPart,
  isFindJobsNowToolName,
  isGetDailyBriefToolName,
  isOpenDailyBriefToolName,
  isProposeMailCrmChangeToolName,
  isHubApprovalToolName,
  isHubJobPageExtractToolName,
  isHubToolUiPart,
  isOpenEntityFormToolName,
  isOpenSurfaceToolName,
  isProposeApplicationFromJdToolName,
  isProposeEvidenceChangeToolName,
  isProposeNewJobsTriageToolName,
  openEntityFormActivityLabel,
  openEntityInspectActivityLabel,
  parseOpenEntityFormInput,
  type HubToolNamePart
} from "./hub-tool-names";

function isWaitingState(state: string | undefined, statusType: string | undefined): boolean {
  if (statusType === "running" || statusType === "requires-action") return true;
  return (
    state === "input-available" ||
    state === "input-streaming" ||
    state === "call" ||
    state === "partial-call"
  );
}

function isCompleteState(state: string | undefined, statusType: string | undefined): boolean {
  if (statusType === "complete" || statusType === "incomplete") return true;
  return state === "output-available" || state === "output-error";
}

/** Tools that render their own thread UI — never a compact activity row. */
export function isHubChoiceToolName(name: string): boolean {
  return (
    isProposeApplicationFromJdToolName(name) ||
    isProposeNewJobsTriageToolName(name) ||
    isProposeEvidenceChangeToolName(name) ||
    isOpenSurfaceToolName(name) ||
    isHubApprovalToolName(name) ||
    isOpenEntityFormToolName(name) ||
    isFindJobsNowToolName(name) ||
    isGetDailyBriefToolName(name) ||
    isOpenDailyBriefToolName(name) ||
    isProposeMailCrmChangeToolName(name)
  );
}

export function isHubWorkingStripToolName(name: string): boolean {
  return name.length > 0 && !isHubChoiceToolName(name);
}

export function isHubListingExtractActive(parts: readonly unknown[]): boolean {
  for (const raw of parts) {
    if (!raw || typeof raw !== "object") continue;
    const part = raw as HubToolNamePart & { status?: { type?: string } };
    if (!isHubToolUiPart(part)) continue;
    const name = hubToolNameFromPart(part);
    if (!isHubJobPageExtractToolName(name)) continue;
    if (isWaitingState(part.state, part.status?.type)) return true;
  }
  return false;
}

export function humanizeHubToolName(name: string, input?: unknown): string {
  const bare = name.startsWith("agent-") ? name.slice("agent-".length) : name;
  if (/jobPageExtractor|fetch-job-page|fetchJobPage/i.test(bare)) return "Reading listing";
  if (/getJobPreferences|get-job-preferences/i.test(bare)) return "Checking job preferences";
  if (/upsertSoftJobPreferences|upsert-soft-job-preferences/i.test(bare)) {
    return "Updating job preferences";
  }
  if (/proposeHardPreferenceChange|propose-hard-preference-change/i.test(bare)) {
    return "Updating hard-stop preferences";
  }
  if (/findJobsNow|find-jobs-now/i.test(bare)) return "Finding jobs";
  if (/getSearchBrief|get-search-brief/i.test(bare)) return "Loading search brief";
  if (/getDailyBrief|get-daily-brief/i.test(bare)) return "Gathering today";
  if (/openDailyBrief|open-daily-brief/i.test(bare)) return "Opening today";
  if (/classifyMail|classify-mail/i.test(bare)) return "Reading that mail";
  if (/searchMail|search-mail/i.test(bare)) return "Searching mail";
  if (/proposeMailCrmChange|propose-mail-crm-change/i.test(bare)) return "Checking the board";
  if (/openEntityInspect|open-entity-inspect/i.test(bare)) {
    const kind =
      input && typeof input === "object" && "kind" in input
        ? (input as { kind?: string }).kind
        : undefined;
    return openEntityInspectActivityLabel(
      kind === "experience" || kind === "stack" || kind === "project" ? kind : "project"
    );
  }
  if (/openEntityForm|open-entity-form/i.test(bare)) {
    return openEntityFormActivityLabel(parseOpenEntityFormInput(input)?.kind ?? "experience");
  }
  return bare
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildHubAgentActivityItems(parts: readonly unknown[]): AgentActivityItem[] {
  const items: AgentActivityItem[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const raw = parts[index];
    if (!raw || typeof raw !== "object") continue;
    const part = raw as HubToolNamePart & { text?: string; status?: { type?: string } };

    if (part.type === "reasoning") {
      // Reasoning stays off-screen (HubHiddenReasoningGroup). Do not dump
      // thought lists into the working strip — users saw maxSteps/tool-name
      // monologues as chat bullets.
      continue;
    }

    if (!isHubToolUiPart(part)) continue;
    const name = hubToolNameFromPart(part);
    if (!isHubWorkingStripToolName(name)) continue;
    if (hubSubagentListShouldShow(parts) && isHubSubagentWorkerName(name)) continue;

    const statusType = part.status?.type;
    const running = isWaitingState(part.state, statusType);
    const complete = isCompleteState(part.state, statusType);
    const id = part.toolCallId && part.toolCallId.length > 0 ? part.toolCallId : `tool-${index}`;
    const status: AgentStepStatus = running ? "active" : complete ? "complete" : "pending";
    const label = humanizeHubToolName(name, part.input);

    if (isHubJobPageExtractToolName(name)) {
      const existing = items.find(
        (item) => item.type === "step" && item.label === "Reading listing"
      );
      if (existing && existing.type === "step") {
        if (existing.status !== "active" && status === "active") existing.status = "active";
        continue;
      }
    }

    items.push({
      id,
      type: "step",
      label,
      status
    });
  }

  return items;
}

export function hubAgentActivityStatus(input: {
  items: readonly AgentActivityItem[];
  parts: readonly unknown[];
  isRunning: boolean;
}): AgentActivityStatus {
  if (isHubListingExtractActive(input.parts)) return "working";

  const reasoningStreaming = input.parts.some((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const part = raw as { type?: string; state?: string; status?: { type?: string } };
    if (part.type !== "reasoning") return false;
    return part.state === "streaming" || part.status?.type === "running";
  });
  if (reasoningStreaming) return "working";

  if (input.isRunning && input.items.length > 0) {
    const allSettled = input.items.every((item) => {
      if (item.type === "step") return item.status === "complete";
      return true;
    });
    if (!allSettled) return "working";
  }

  if (input.isRunning && input.items.length === 0) return "working";
  return "complete";
}

export function hubAgentActivityActiveLabel(
  items: readonly AgentActivityItem[],
  parts: readonly unknown[] = []
): string {
  if (isHubListingExtractActive(parts)) return "Reading listing…";
  if (items.some((item) => item.type === "tool")) return "Running tools…";
  if (items.some((item) => item.type === "step")) return "Thinking…";
  if (items.some((item) => item.type === "text")) return "Thinking…";
  return "Working through it…";
}
