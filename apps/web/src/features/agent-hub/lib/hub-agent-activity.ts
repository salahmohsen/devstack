import {
  type AgentActivityItem,
  type AgentActivityStatus
} from "@/shared/ui/agents/agent-activity";

import {
  hubToolNameFromPart,
  isHubApprovalToolName,
  isHubJobPageExtractToolName,
  isHubToolUiPart,
  isOpenSurfaceToolName,
  isProposeApplicationFromJdToolName,
  isProposeNewJobsTriageToolName,
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

/** Tools that render their own HITL UI — never a compact activity row. */
export function isHubChoiceToolName(name: string): boolean {
  return (
    isProposeApplicationFromJdToolName(name) ||
    isProposeNewJobsTriageToolName(name) ||
    isOpenSurfaceToolName(name) ||
    isHubApprovalToolName(name)
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

export function humanizeHubToolName(name: string): string {
  const bare = name.startsWith("agent-") ? name.slice("agent-".length) : name;
  if (/jobPageExtractor|fetch-job-page|fetchJobPage/i.test(bare)) return "Reading listing";
  if (/getJobPreferences|get-job-preferences/i.test(bare)) return "Checking job preferences";
  return bare
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reasoningText(part: { type?: string; text?: unknown }): string {
  return typeof part.text === "string" ? part.text : "";
}

function reasoningLines(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 0) return lines;
  const trimmed = text.trim();
  return trimmed.length > 0 ? [trimmed] : [];
}

export function buildHubAgentActivityItems(parts: readonly unknown[]): AgentActivityItem[] {
  const items: AgentActivityItem[] = [];
  let reasoningIndex = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const raw = parts[index];
    if (!raw || typeof raw !== "object") continue;
    const part = raw as HubToolNamePart & { text?: string; status?: { type?: string } };

    if (part.type === "reasoning") {
      const lines = reasoningLines(reasoningText(part));
      for (const [lineIndex, content] of lines.entries()) {
        items.push({
          id: `reasoning-${reasoningIndex}-${lineIndex}`,
          type: "text",
          content
        });
      }
      if (lines.length > 0) reasoningIndex += 1;
      continue;
    }

    if (!isHubToolUiPart(part)) continue;
    const name = hubToolNameFromPart(part);
    if (!isHubWorkingStripToolName(name)) continue;

    const statusType = part.status?.type;
    const running = isWaitingState(part.state, statusType);
    const complete = isCompleteState(part.state, statusType);
    const id = part.toolCallId && part.toolCallId.length > 0 ? part.toolCallId : `tool-${index}`;

    items.push({
      id,
      type: "step",
      label: humanizeHubToolName(name),
      status: running ? "active" : complete ? "complete" : "pending"
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
