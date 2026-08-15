import { type UIMessage } from "ai";

import {
  type ProposeApplicationFromJdOutput,
  type ProposeNewJobsTriageOutput,
  type ProposeNewJobsTriageRow
} from "@tsu-stack/core";

/**
 * Mastra tool id plus the camelCase agent registration key. Stream UI parts
 * may use either (`tool-propose-application-from-jd` vs
 * `tool-proposeApplicationFromJd`).
 */
export const HUB_PROPOSE_APPLICATION_FROM_JD_TOOL_NAMES = new Set([
  "propose-application-from-jd",
  "proposeApplicationFromJd"
]);

/** Mastra tool id plus camelCase registration key for apply-package HITL. */
export const HUB_GENERATE_APPLY_PACKAGE_TOOL_NAMES = new Set([
  "generate-apply-package",
  "generateApplyPackage"
]);

export const HUB_ACCEPT_APPLY_PACKAGE_TOOL_NAMES = new Set([
  "accept-apply-package",
  "acceptApplyPackage"
]);

export const HUB_SEND_APPLY_OUTREACH_TOOL_NAMES = new Set([
  "send-apply-outreach",
  "sendApplyOutreach"
]);

export const HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES = new Set([
  "propose-new-jobs-triage",
  "proposeNewJobsTriage"
]);

export const HUB_OPEN_SURFACE_TOOL_NAMES = new Set(["open-surface", "openSurface"]);

export type HubToolNamePart = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

export type ProposeApplicationFromJdCardInput = {
  title: string;
  companyName: string;
  description: string;
  url?: string | null;
  applyUrl?: string | null;
  location?: string | null;
  matchScore?: number | null;
  notes?: string | null;
};

export type ProposeApplicationFromJdAction = ProposeApplicationFromJdOutput["action"];

export type PendingProposeApplicationFromJd = {
  toolCallId: string;
  toolName: string;
  input: ProposeApplicationFromJdCardInput;
};

export type ProposeNewJobsTriageCardInput = {
  track: ProposeNewJobsTriageRow[];
  dismiss: ProposeNewJobsTriageRow[];
};

/** AI SDK static (`tool-<name>`) or dynamic-tool part. */
export function isHubToolUiPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

/**
 * Resolve the Mastra / AI SDK tool name from a UI part.
 * Prefers `toolName`, then the suffix after `tool-`.
 */
export function hubToolNameFromPart(part: HubToolNamePart): string {
  if (part.toolName && part.toolName.length > 0) return part.toolName;
  if (part.type === "dynamic-tool") return "tool";
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.type;
}

export function isProposeApplicationFromJdToolName(name: string): boolean {
  return HUB_PROPOSE_APPLICATION_FROM_JD_TOOL_NAMES.has(name);
}

export function isGenerateApplyPackageToolName(name: string): boolean {
  return HUB_GENERATE_APPLY_PACKAGE_TOOL_NAMES.has(name);
}

export function isAcceptApplyPackageToolName(name: string): boolean {
  return HUB_ACCEPT_APPLY_PACKAGE_TOOL_NAMES.has(name);
}

export function isSendApplyOutreachToolName(name: string): boolean {
  return HUB_SEND_APPLY_OUTREACH_TOOL_NAMES.has(name);
}

export function isProposeNewJobsTriageToolName(name: string): boolean {
  return HUB_PROPOSE_NEW_JOBS_TRIAGE_TOOL_NAMES.has(name);
}

export function isOpenSurfaceToolName(name: string): boolean {
  return HUB_OPEN_SURFACE_TOOL_NAMES.has(name);
}

/** Approval-gated package / send tools (requireToolApproval). */
export function isHubApprovalToolName(name: string): boolean {
  return (
    isGenerateApplyPackageToolName(name) ||
    isAcceptApplyPackageToolName(name) ||
    isSendApplyOutreachToolName(name) ||
    name === "send-mail-reply" ||
    name === "sendMailReply" ||
    name === "create-application" ||
    name === "createApplication"
  );
}

export function parseProposeApplicationFromJdInput(
  input: unknown
): ProposeApplicationFromJdCardInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { title: "", companyName: "", description: "" };
  }
  const o = input as Partial<ProposeApplicationFromJdCardInput>;
  return {
    title: typeof o.title === "string" ? o.title : "",
    companyName: typeof o.companyName === "string" ? o.companyName : "",
    description: typeof o.description === "string" ? o.description : "",
    url: typeof o.url === "string" ? o.url : null,
    applyUrl: typeof o.applyUrl === "string" ? o.applyUrl : null,
    location: typeof o.location === "string" ? o.location : null,
    matchScore: typeof o.matchScore === "number" ? o.matchScore : null,
    notes: typeof o.notes === "string" ? o.notes : null
  };
}

export function parseProposeApplicationFromJdOutputAction(
  output: unknown
): ProposeApplicationFromJdAction | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const action = (output as { action?: unknown }).action;
  if (action === "package" || action === "save" || action === "dismiss") return action;
  return null;
}

function parseTriageRow(raw: unknown): ProposeNewJobsTriageRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  return {
    id,
    title: typeof o.title === "string" ? o.title : "",
    companyName: typeof o.companyName === "string" ? o.companyName : "",
    matchScore: typeof o.matchScore === "number" ? o.matchScore : null,
    reason: typeof o.reason === "string" ? o.reason : null
  };
}

export function parseProposeNewJobsTriageInput(input: unknown): ProposeNewJobsTriageCardInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { track: [], dismiss: [] };
  }
  const o = input as { track?: unknown; dismiss?: unknown };
  const track = Array.isArray(o.track)
    ? o.track.map(parseTriageRow).filter((r): r is ProposeNewJobsTriageRow => r != null)
    : [];
  const dismiss = Array.isArray(o.dismiss)
    ? o.dismiss.map(parseTriageRow).filter((r): r is ProposeNewJobsTriageRow => r != null)
    : [];
  return { track, dismiss };
}

export function parseProposeNewJobsTriageOutput(
  output: unknown
): ProposeNewJobsTriageOutput | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const o = output as {
    action?: unknown;
    trackIds?: unknown;
    dismissIds?: unknown;
  };
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

export function parseOpenSurfaceHref(args: unknown): string | null {
  if (!args || typeof args !== "object" || Array.isArray(args)) return null;
  const href = (args as { href?: unknown }).href;
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type HubHitlKind = "approval" | "client";

/**
 * HITL wait on the last assistant message, from AI SDK part states only
 * (no TAP / assistant-ui thread status).
 */
export function lastHubHitlKind(messages: UIMessage[]): HubHitlKind | null {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return null;

  for (const raw of last.parts ?? []) {
    const part = raw as HubToolNamePart;
    if (!isHubToolUiPart(part)) continue;
    if (part.state === "approval-requested") return "approval";
    const name = hubToolNameFromPart(part);
    const waiting =
      part.state === "input-available" ||
      part.state === "input-streaming" ||
      part.state === "call" ||
      part.state === "partial-call";
    if (!waiting) continue;
    if (isHubApprovalToolName(name)) return "approval";
    if (isProposeApplicationFromJdToolName(name)) return "client";
    if (isProposeNewJobsTriageToolName(name)) return "client";
    if (isOpenSurfaceToolName(name)) return "client";
  }
  return null;
}

/** Latest assistant propose-from-jd tool still waiting for a client `addToolOutput`. */
export function findPendingProposeApplicationFromJd(
  messages: UIMessage[]
): PendingProposeApplicationFromJd | null {
  for (const msg of [...messages].toReversed()) {
    if (msg.role !== "assistant") continue;
    for (const raw of [...(msg.parts ?? [])].toReversed()) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      const toolName = hubToolNameFromPart(part);
      if (!isProposeApplicationFromJdToolName(toolName)) continue;
      if (
        part.state !== "input-available" &&
        part.state !== "input-streaming" &&
        part.state !== "call" &&
        part.state !== "partial-call"
      ) {
        continue;
      }
      const toolCallId = part.toolCallId ?? "";
      if (!toolCallId) continue;
      return {
        toolCallId,
        toolName,
        input: parseProposeApplicationFromJdInput(part.input)
      };
    }
  }
  return null;
}
