import { type UIMessage } from "ai";

import {
  ApplicationApplyMethodSchema,
  ApplicationSourceSchema,
  EmploymentTypeSchema,
  WorkModeSchema,
  type ApplicationApplyMethod,
  type ApplicationSource,
  type EmploymentType,
  type ProposeApplicationFromJdOutput,
  type ProposeNewJobsTriageOutput,
  type ProposeNewJobsTriageRow,
  type WorkMode
} from "@tsu-stack/core";

import { recalledJdCardAction } from "./jd-card-action-memory";

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

/** Silent listing prelude (Mastra `agent-<key>` + kebab/camel fetch). */
export const HUB_JOB_PAGE_EXTRACT_TOOL_NAMES = new Set([
  "jobPageExtractor",
  "job-page-extractor",
  "agent-jobPageExtractor",
  "agent-job-page-extractor",
  "fetch-job-page",
  "fetchJobPage"
]);

export const HUB_LIST_EXPERIENCES_TOOL_NAMES = new Set(["list-experiences", "listExperiences"]);

export const HUB_GET_EXPERIENCE_TOOL_NAMES = new Set(["get-experience", "getExperience"]);

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
  salaryRange?: string | null;
  applyMethod?: ApplicationApplyMethod | null;
  workMode?: WorkMode | null;
  employmentType?: EmploymentType | null;
  department?: string | null;
  datePosted?: string | null;
  experience?: string | null;
  source?: ApplicationSource | null;
  matchScore?: number | null;
  notes?: string | null;
  requiredSkills?: string[];
  preferredSkills?: string[];
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

export function isHubJobPageExtractToolName(name: string): boolean {
  if (HUB_JOB_PAGE_EXTRACT_TOOL_NAMES.has(name)) return true;
  const bare = name.startsWith("agent-") ? name.slice("agent-".length) : name;
  return /jobPageExtractor|job-page-extractor|fetch-job-page|fetchJobPage/i.test(bare);
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

function parseEnum<T extends string>(
  value: unknown,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }
): T | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? (parsed.data ?? null) : null;
}

export function parseProposeApplicationFromJdInput(
  input: unknown
): ProposeApplicationFromJdCardInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { title: "", companyName: "", description: "" };
  }
  const o = input as Record<string, unknown>;
  const notes =
    typeof o.notes === "string" ? o.notes : typeof o.agentTake === "string" ? o.agentTake : null;
  const url =
    typeof o.url === "string" ? o.url : typeof o.listingUrl === "string" ? o.listingUrl : null;
  return {
    title: typeof o.title === "string" ? o.title : "",
    companyName: typeof o.companyName === "string" ? o.companyName : "",
    description: typeof o.description === "string" ? o.description : "",
    url,
    applyUrl: typeof o.applyUrl === "string" ? o.applyUrl : null,
    location: typeof o.location === "string" ? o.location : null,
    salaryRange: typeof o.salaryRange === "string" ? o.salaryRange : null,
    applyMethod: parseEnum(o.applyMethod, ApplicationApplyMethodSchema),
    workMode: parseEnum(o.workMode, WorkModeSchema),
    employmentType: parseEnum(o.employmentType, EmploymentTypeSchema),
    department: typeof o.department === "string" ? o.department.slice(0, 80) : null,
    datePosted: typeof o.datePosted === "string" ? o.datePosted.slice(0, 40) : null,
    experience: typeof o.experience === "string" ? o.experience.slice(0, 80) : null,
    source: parseEnum(o.source, ApplicationSourceSchema),
    matchScore: coerceMatchScore(o.matchScore),
    notes,
    requiredSkills: parseSkillNames(o.requiredSkills),
    preferredSkills: parseSkillNames(o.preferredSkills)
  };
}

function parseSkillNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const name =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string"
          ? (item as { name: string }).name.trim()
          : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name.slice(0, 80));
    if (out.length >= 24) break;
  }
  return out;
}

function coerceMatchScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return Math.min(100, Math.max(0, Math.round(parsed)));
  }
  return null;
}

export function parseProposeApplicationFromJdOutputAction(
  output: unknown
): ProposeApplicationFromJdAction | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const action = (output as { action?: unknown }).action;
  if (action === "package" || action === "save" || action === "dismiss") return action;
  return null;
}

/** Stable listing identity so /comm/ and /jobs/view/ of the same id match. */
export function jdListingKey(input: {
  url?: string | null;
  applyUrl?: string | null;
}): string | null {
  const fromUrl = input.url?.trim() ?? "";
  const raw = fromUrl.length > 0 ? fromUrl : (input.applyUrl?.trim() ?? "");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    const linkedInId = path.match(/\/(?:comm\/)?jobs\/view\/(\d+)/);
    if (host.includes("linkedin.") && linkedInId?.[1]) {
      return `linkedin:${linkedInId[1]}`;
    }
    return `${host}${path}`;
  } catch {
    return raw.toLowerCase();
  }
}

/** True when another propose card for this listing already has save/package/dismiss. */
export function listingHasResolvedJdProposal(
  messages: UIMessage[],
  listingKey: string,
  exceptToolCallId: string
): boolean {
  let lastUserIndex = -1;
  for (let index = 0; index < messages.length; index += 1) {
    if (messages[index]?.role === "user") lastUserIndex = index;
  }
  const currentTurn = lastUserIndex >= 0 ? messages.slice(lastUserIndex + 1) : messages;
  for (const msg of currentTurn) {
    if (msg.role !== "assistant") continue;
    for (const raw of msg.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      if (!isProposeApplicationFromJdToolName(hubToolNameFromPart(part))) continue;
      const id = part.toolCallId ?? "";
      if (!id || id === exceptToolCallId) continue;
      if (!parseProposeApplicationFromJdOutputAction(part.output)) continue;
      const key = jdListingKey(parseProposeApplicationFromJdInput(part.input));
      if (key && key === listingKey) return true;
    }
  }
  return false;
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

function isHubToolWaitingState(state: string | undefined): boolean {
  return (
    state === "input-available" ||
    state === "input-streaming" ||
    state === "call" ||
    state === "partial-call"
  );
}

/**
 * True when a waiting JD propose still has buttons. Receipts, superseded
 * cards, and same-listing follow-ups must not lock the composer.
 */
export function isActionablePendingJdProposal(
  messages: UIMessage[],
  part: HubToolNamePart
): boolean {
  const name = hubToolNameFromPart(part);
  if (!isProposeApplicationFromJdToolName(name)) return false;
  if (!isHubToolWaitingState(part.state)) return false;
  if (parseProposeApplicationFromJdOutputAction(part.output)) return false;
  const toolCallId = part.toolCallId ?? "";
  if (toolCallId && recalledJdCardAction(toolCallId)) return false;
  const input = parseProposeApplicationFromJdInput(part.input);
  const listingKey = jdListingKey(input);
  if (listingKey && listingHasResolvedJdProposal(messages, listingKey, toolCallId)) {
    return false;
  }
  const latestPending = findPendingProposeApplicationFromJd(messages);
  if (latestPending && latestPending.toolCallId !== toolCallId) return false;
  return true;
}

/**
 * HITL wait on the last assistant message.
 * Only lock the composer when a visible approval or a JD/triage choice remains.
 * `open-surface` auto-completes — it is not a user choice.
 */
export function lastHubHitlKind(messages: UIMessage[]): HubHitlKind | null {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return null;

  for (const raw of last.parts ?? []) {
    const part = raw as HubToolNamePart;
    if (!isHubToolUiPart(part)) continue;
    if (part.state === "approval-requested") return "approval";
    const name = hubToolNameFromPart(part);
    if (!isHubToolWaitingState(part.state)) continue;
    if (isHubApprovalToolName(name)) return "approval";
    if (isProposeApplicationFromJdToolName(name)) {
      if (isActionablePendingJdProposal(messages, part)) return "client";
      continue;
    }
    if (isProposeNewJobsTriageToolName(name)) {
      if (parseProposeNewJobsTriageOutput(part.output)) continue;
      return "client";
    }
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
      if (!isHubToolWaitingState(part.state)) continue;
      const toolCallId = part.toolCallId ?? "";
      if (!toolCallId) continue;
      if (parseProposeApplicationFromJdOutputAction(part.output)) continue;
      if (recalledJdCardAction(toolCallId)) continue;
      return {
        toolCallId,
        toolName,
        input: parseProposeApplicationFromJdInput(part.input)
      };
    }
  }
  return null;
}
