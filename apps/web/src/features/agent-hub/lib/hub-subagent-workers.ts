import { type SubagentItem } from "@/shared/ui/subagent-list";

import {
  hubToolNameFromPart,
  isHubJobPageExtractToolName,
  isHubToolUiPart,
  type HubToolNamePart
} from "./hub-tool-names";

export type HubSubagentListModel = {
  agents: SubagentItem[];
  completedCount: number;
  progress: number[];
  showSummary: boolean;
  summaryAgent: SubagentItem;
};

const WORKER_LABELS: Record<string, string> = {
  stackcategorizeragent: "Stack categorizer",
  mailclassifieragent: "Mail classifier",
  mailreplyagent: "Mail reply",
  jobnotifiermailextractor: "Job notifier extract",
  jobpageextractor: "Listing extract",
  jobpreferencematchscorer: "Preference match",
  crmapplicationmatcher: "Application match",
  crmstageadvisor: "Stage advisor",
  detectstacksworkflow: "Detect stacks",
  organizestacksworkflow: "Organize stacks",
  resumeimportworkflow: "Resume import",
  mailprocessworkflow: "Process mail",
  mailclassifyworkflow: "Classify mail",
  mailjobharvestworkflow: "Harvest jobs",
  mailreplyworkflow: "Mail reply workflow"
};

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

function normalizeWorkerKey(name: string): string {
  let bare = name;
  if (bare.startsWith("agent-")) bare = bare.slice("agent-".length);
  if (bare.startsWith("workflow-")) bare = bare.slice("workflow-".length);
  return bare.replace(/[-_]/g, "").toLowerCase();
}

/** Mastra supervisor specialists and workflows (not fetch-job-page). */
export function isHubSubagentWorkerName(name: string): boolean {
  if (!name) return false;
  if (/^fetch-job-page$|^fetchJobPage$/i.test(name)) return false;
  if (name.startsWith("agent-") || name.startsWith("workflow-")) return true;
  const key = normalizeWorkerKey(name);
  return key in WORKER_LABELS;
}

export function hubSubagentWorkerLabel(name: string): string {
  const key = normalizeWorkerKey(name);
  if (WORKER_LABELS[key]) return WORKER_LABELS[key];
  return name
    .replace(/^agent-/, "")
    .replace(/^workflow-/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type WorkerRow = {
  id: string;
  name: string;
  label: string;
  done: boolean;
  running: boolean;
};

function collectWorkers(parts: readonly unknown[]): WorkerRow[] {
  const rows: WorkerRow[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < parts.length; index += 1) {
    const raw = parts[index];
    if (!raw || typeof raw !== "object") continue;
    const part = raw as HubToolNamePart & { status?: { type?: string } };
    if (!isHubToolUiPart(part)) continue;
    const name = hubToolNameFromPart(part);
    if (!isHubSubagentWorkerName(name)) continue;
    const id = part.toolCallId && part.toolCallId.length > 0 ? part.toolCallId : `worker-${index}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const running = isWaitingState(part.state, part.status?.type);
    const done = isCompleteState(part.state, part.status?.type);
    rows.push({
      id,
      name,
      label: hubSubagentWorkerLabel(name),
      done,
      running
    });
  }
  return rows;
}

/** True when the official SubagentList should render (parallel / specialist work). */
export function hubSubagentListShouldShow(parts: readonly unknown[]): boolean {
  const workers = collectWorkers(parts);
  if (workers.length === 0) return false;
  if (workers.length >= 2) return true;
  return !isHubJobPageExtractToolName(workers[0]?.name ?? "");
}

export function buildHubSubagentListModel(
  parts: readonly unknown[],
  input: { modelLabel: string; isRunning: boolean }
): HubSubagentListModel | null {
  if (!hubSubagentListShouldShow(parts)) return null;
  const workers = collectWorkers(parts);
  const sorted = workers.toSorted((a, b) => Number(b.done) - Number(a.done));
  const completedCount = sorted.filter((row) => row.done).length;
  const allDone = completedCount === sorted.length;
  return {
    agents: sorted.map((row) => {
      return { name: row.label, model: input.modelLabel };
    }),
    completedCount,
    progress: sorted.map((row) => (row.done ? 100 : row.running ? 45 : 8)),
    showSummary: input.isRunning && allDone,
    summaryAgent: { name: "Hub supervisor", model: input.modelLabel }
  };
}
