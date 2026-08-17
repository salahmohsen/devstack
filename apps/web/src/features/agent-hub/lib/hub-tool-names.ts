import { type UIMessage } from "ai";

import {
  ApplicationApplyMethodSchema,
  ApplicationSourceSchema,
  EmploymentTypeSchema,
  ProposeEvidenceChangeInputSchema,
  ProposeEvidenceChangeOutputSchema,
  ProposeHardPreferenceChangeInputSchema,
  ProposeHardPreferenceChangeOutputSchema,
  ProposeMailCrmChangeInputSchema,
  ProposeMailCrmChangeOutputSchema,
  WorkModeSchema,
  type ApplicationApplyMethod,
  type ApplicationSource,
  type EmploymentType,
  type ProposeApplicationFromJdOutput,
  type ProposeEvidenceChangeInput,
  type ProposeEvidenceChangeOutput,
  type ProposeHardPreferenceChangeInput,
  type ProposeHardPreferenceChangeOutput,
  type ProposeMailCrmChangeInput,
  type ProposeMailCrmChangeOutput,
  type ProposeNewJobsTriageOutput,
  type ProposeNewJobsTriageRow,
  type WorkMode
} from "@tsu-stack/core";

import { parseDailyBriefFacts, type DailyBriefFacts } from "./format-daily-brief";
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

export const HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES = new Set([
  "propose-hard-preference-change",
  "proposeHardPreferenceChange"
]);

export const HUB_OPEN_ENTITY_FORM_TOOL_NAMES = new Set(["open-entity-form", "openEntityForm"]);

export const HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES = new Set([
  "open-entity-inspect",
  "openEntityInspect"
]);

export const HUB_FIND_JOBS_NOW_TOOL_NAMES = new Set(["find-jobs-now", "findJobsNow"]);

export const HUB_GET_SEARCH_BRIEF_TOOL_NAMES = new Set(["get-search-brief", "getSearchBrief"]);

export const HUB_GET_DAILY_BRIEF_TOOL_NAMES = new Set(["get-daily-brief", "getDailyBrief"]);

export const HUB_OPEN_DAILY_BRIEF_TOOL_NAMES = new Set(["open-daily-brief", "openDailyBrief"]);

export const HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES = new Set([
  "propose-mail-crm-change",
  "proposeMailCrmChange"
]);

export const HUB_CLASSIFY_MAIL_TOOL_NAMES = new Set(["classify-mail", "classifyMail"]);

export const HUB_SEARCH_MAIL_TOOL_NAMES = new Set(["search-mail", "searchMail"]);

export function isGetDailyBriefToolName(name: string): boolean {
  return HUB_GET_DAILY_BRIEF_TOOL_NAMES.has(name);
}

export function parseGetDailyBriefCounts(output: unknown): {
  inboxCount: number;
  mailCount: number;
  trackedCount: number;
} | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const row = output as Record<string, unknown>;
  const inboxCount = typeof row.inboxCount === "number" ? row.inboxCount : null;
  const mailCount = typeof row.mailCount === "number" ? row.mailCount : null;
  const trackedCount = typeof row.trackedCount === "number" ? row.trackedCount : null;
  if (inboxCount == null && mailCount == null && trackedCount == null) return null;
  return {
    inboxCount: inboxCount ?? 0,
    mailCount: mailCount ?? 0,
    trackedCount: trackedCount ?? 0
  };
}

export function latestDailyBriefFactsFromMessages(
  messages: readonly { role?: string; parts?: readonly unknown[] }[]
): DailyBriefFacts | null {
  for (const message of [...messages].toReversed()) {
    if (message.role !== "assistant") continue;
    for (const raw of [...(message.parts ?? [])].toReversed()) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as { type?: string; toolName?: string; output?: unknown };
      const name =
        part.toolName ??
        (typeof part.type === "string" && part.type.startsWith("tool-") ? part.type.slice(5) : "");
      if (!isGetDailyBriefToolName(name)) continue;
      const facts = parseDailyBriefFacts(part.output);
      if (facts) return facts;
    }
  }
  return null;
}

export function latestDailyBriefCountsFromMessages(
  messages: readonly { role?: string; parts?: readonly unknown[] }[]
): { inboxCount: number; mailCount: number; trackedCount: number } | null {
  for (const message of [...messages].toReversed()) {
    if (message.role !== "assistant") continue;
    for (const raw of [...(message.parts ?? [])].toReversed()) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as { type?: string; toolName?: string; output?: unknown };
      const name =
        part.toolName ??
        (typeof part.type === "string" && part.type.startsWith("tool-") ? part.type.slice(5) : "");
      if (!isGetDailyBriefToolName(name)) continue;
      const counts = parseGetDailyBriefCounts(part.output);
      if (counts) return counts;
    }
  }
  return null;
}

export function isOpenDailyBriefToolName(name: string): boolean {
  return HUB_OPEN_DAILY_BRIEF_TOOL_NAMES.has(name);
}

export function isProposeMailCrmChangeToolName(name: string): boolean {
  return HUB_PROPOSE_MAIL_CRM_CHANGE_TOOL_NAMES.has(name);
}

export function isClassifyMailToolName(name: string): boolean {
  return HUB_CLASSIFY_MAIL_TOOL_NAMES.has(name);
}

export const HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES = new Set([
  "propose-evidence-change",
  "proposeEvidenceChange"
]);

export const HUB_LIST_NEW_JOBS_TOOL_NAMES = new Set(["list-new-jobs", "listNewJobs"]);

export const HUB_UPSERT_SOFT_JOB_PREFERENCES_TOOL_NAMES = new Set([
  "upsert-soft-job-preferences",
  "upsertSoftJobPreferences"
]);

export type OpenEntityFormKind = "experience" | "project" | "stack";

export type OpenEntityFormInput = {
  kind: OpenEntityFormKind;
  id: string | null;
  plan: string;
};

export type OpenEntityInspectInput = {
  kind: OpenEntityFormKind;
  id: string;
};

export type OpenEntityInspectOutput = {
  ok: boolean;
  kind: OpenEntityFormKind;
  id?: string;
  opened: boolean;
};

export type OpenEntityFormOutput = {
  ok: boolean;
  kind: OpenEntityFormKind;
  id?: string;
  saved: boolean;
  cancelled?: boolean;
};

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

export function isListNewJobsToolName(name: string): boolean {
  return HUB_LIST_NEW_JOBS_TOOL_NAMES.has(name);
}

export function isOpenSurfaceToolName(name: string): boolean {
  return HUB_OPEN_SURFACE_TOOL_NAMES.has(name);
}

export function isProposeHardPreferenceChangeToolName(name: string): boolean {
  return HUB_PROPOSE_HARD_PREFERENCE_CHANGE_TOOL_NAMES.has(name);
}

export function isOpenEntityFormToolName(name: string): boolean {
  return HUB_OPEN_ENTITY_FORM_TOOL_NAMES.has(name);
}

export function isOpenEntityInspectToolName(name: string): boolean {
  return HUB_OPEN_ENTITY_INSPECT_TOOL_NAMES.has(name);
}

export function isFindJobsNowToolName(name: string): boolean {
  return HUB_FIND_JOBS_NOW_TOOL_NAMES.has(name);
}

export function isGetSearchBriefToolName(name: string): boolean {
  return HUB_GET_SEARCH_BRIEF_TOOL_NAMES.has(name);
}

export function isProposeEvidenceChangeToolName(name: string): boolean {
  return HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES.has(name);
}

export function isUpsertSoftJobPreferencesToolName(name: string): boolean {
  return HUB_UPSERT_SOFT_JOB_PREFERENCES_TOOL_NAMES.has(name);
}

export function openEntityFormActivityLabel(kind: OpenEntityFormKind): string {
  if (kind === "project") return "Opening project form";
  if (kind === "stack") return "Opening stack form";
  return "Opening experience form";
}

export function openEntityInspectActivityLabel(kind: OpenEntityFormKind): string {
  if (kind === "project") return "Opening project";
  if (kind === "stack") return "Opening stack";
  return "Opening experience";
}

export function parseOpenEntityFormInput(input: unknown): OpenEntityFormInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as { kind?: unknown; id?: unknown; plan?: unknown };
  if (o.kind !== "experience" && o.kind !== "project" && o.kind !== "stack") return null;
  const plan = typeof o.plan === "string" ? o.plan.trim() : "";
  if (!plan) return null;
  const rawId = typeof o.id === "string" ? o.id.trim() : "";
  return { kind: o.kind, id: rawId.length > 0 ? rawId : null, plan };
}

export function parseOpenEntityInspectInput(input: unknown): OpenEntityInspectInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as { kind?: unknown; id?: unknown };
  if (o.kind !== "experience" && o.kind !== "project" && o.kind !== "stack") return null;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  return { kind: o.kind, id };
}

export function parseOpenEntityInspectOutput(output: unknown): OpenEntityInspectOutput | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const o = output as { ok?: unknown; kind?: unknown; id?: unknown; opened?: unknown };
  if (typeof o.opened !== "boolean") return null;
  if (o.kind !== "experience" && o.kind !== "project" && o.kind !== "stack") return null;
  return {
    ok: o.ok !== false,
    kind: o.kind,
    id: typeof o.id === "string" && o.id.length > 0 ? o.id : undefined,
    opened: o.opened
  };
}

/** True when this waiting tool call should own the dashboard form host. */
export function shouldRequestEntityFormHost(input: {
  completed: boolean;
  latestPendingId: string | null;
  toolCallId: string;
}): boolean {
  if (input.completed) return false;
  if (!input.toolCallId) return false;
  return input.latestPendingId === input.toolCallId;
}

function isWaitingOpenEntityFormPart(part: {
  type?: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  output?: unknown;
}): boolean {
  const type = part.type ?? "";
  const isTool = type.startsWith("tool-") || type === "dynamic-tool";
  if (!isTool) return false;
  const name = part.toolName ?? (type.startsWith("tool-") ? type.slice("tool-".length) : "");
  if (!isOpenEntityFormToolName(name)) return false;
  if (parseOpenEntityFormOutput(part.output)) return false;
  return (
    part.state === "input-available" ||
    part.state === "input-streaming" ||
    part.state === "call" ||
    part.state === "partial-call"
  );
}

/** Every incomplete open-entity-form call in the thread (oldest first). */
export function pendingOpenEntityFormIds(
  messages: ReadonlyArray<{ role?: string; parts?: readonly unknown[] }>
): string[] {
  const ids: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const raw of msg.parts ?? []) {
      const part = raw as {
        type?: string;
        toolName?: string;
        toolCallId?: string;
        state?: string;
        output?: unknown;
      };
      if (!isWaitingOpenEntityFormPart(part)) continue;
      const id = part.toolCallId ?? "";
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

export function findOpenEntityFormOutputInMessages(
  messages: ReadonlyArray<{ role?: string; parts?: readonly unknown[] }>,
  toolCallId: string
): OpenEntityFormOutput | null {
  if (!toolCallId) return null;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const raw of msg.parts ?? []) {
      const part = raw as HubToolNamePart;
      if ((part.toolCallId ?? "") !== toolCallId) continue;
      const parsed = parseOpenEntityFormOutput(part.output);
      if (parsed) return parsed;
    }
  }
  return null;
}

export function parseOpenEntityFormOutput(output: unknown): OpenEntityFormOutput | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const o = output as {
    ok?: unknown;
    kind?: unknown;
    id?: unknown;
    saved?: unknown;
    cancelled?: unknown;
  };
  if (typeof o.saved !== "boolean") return null;
  if (o.kind !== "experience" && o.kind !== "project" && o.kind !== "stack") return null;
  return {
    ok: o.ok !== false,
    kind: o.kind,
    id: typeof o.id === "string" && o.id.length > 0 ? o.id : undefined,
    saved: o.saved,
    ...(o.cancelled === true ? { cancelled: true } : {})
  };
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

export type TriageHydrateJob = {
  id: string;
  title?: string | null;
  companyName?: string | null;
  matchScore?: number | null;
};

const TRIAGE_HYDRATE_CAP = 15;

function nonemptyOr(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : fallback;
}

export function parseListNewJobsOutput(output: unknown): TriageHydrateJob[] {
  if (!output || typeof output !== "object" || Array.isArray(output)) return [];
  const jobs = (output as { jobs?: unknown }).jobs;
  if (!Array.isArray(jobs)) return [];
  const rows: TriageHydrateJob[] = [];
  for (const raw of jobs) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id) continue;
    rows.push({
      id,
      title: typeof row.title === "string" ? row.title : "",
      companyName: typeof row.companyName === "string" ? row.companyName : "",
      matchScore: typeof row.matchScore === "number" ? row.matchScore : null
    });
  }
  return rows;
}

/** Latest non-empty listNewJobs result in the thread (any turn). */
export function listNewJobsFromMessages(messages: UIMessage[]): TriageHydrateJob[] {
  let latest: TriageHydrateJob[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      if (!isListNewJobsToolName(hubToolNameFromPart(part))) continue;
      const rows = parseListNewJobsOutput(part.output);
      if (rows.length > 0) latest = rows;
    }
  }
  return latest;
}

/**
 * When the model called propose with empty arrays, fill Track from inbox rows.
 * Never invent a Dismiss split.
 */
export function hydrateProposeNewJobsTriageInput(
  parsed: ProposeNewJobsTriageCardInput,
  fallbackJobs: readonly TriageHydrateJob[]
): ProposeNewJobsTriageCardInput {
  if (parsed.track.length > 0 || parsed.dismiss.length > 0) return parsed;
  return {
    track: fallbackJobs.slice(0, TRIAGE_HYDRATE_CAP).map((job) => {
      return {
        id: job.id,
        title: nonemptyOr(job.title, "Untitled role"),
        companyName: nonemptyOr(job.companyName, "Unknown company"),
        matchScore: typeof job.matchScore === "number" ? job.matchScore : null,
        reason: null
      };
    }),
    dismiss: []
  };
}

/**
 * True when this hard-stop card arrived after a confirm on the same user turn.
 */
export function isLaterHardStopAfterConfirm(messages: UIMessage[], toolCallId: string): boolean {
  let afterLatestUser = false;
  let sawConfirm = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawConfirm = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      if (!isProposeHardPreferenceChangeToolName(hubToolNameFromPart(part))) continue;
      const id = part.toolCallId ?? "";
      const output = parseProposeHardPreferenceChangeOutput(part.output);
      if (id && id === toolCallId) return sawConfirm;
      if (output?.action === "confirm") sawConfirm = true;
    }
  }
  return sawConfirm;
}

export function evidenceEntityKey(kind: string | undefined, id: string | undefined): string | null {
  if (kind !== "project" && kind !== "experience" && kind !== "stack") return null;
  const trimmed = id?.trim() ?? "";
  return trimmed.length > 0 ? `${kind}:${trimmed}` : `${kind}:__create__`;
}

/**
 * True when this evidence card re-proposes the same kind+id after Confirm
 * *or* Cancel this turn. A later card for a *different* entity (RAYA after
 * Dev-Hub) must stay — do not clone the hard-stop/triage hide-all helper.
 */
export function isLaterEvidenceAfterSameEntityConfirm(
  messages: UIMessage[],
  toolCallId: string
): boolean {
  let afterLatestUser = false;
  const settled = new Set<string>();
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      settled.clear();
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      if (!isProposeEvidenceChangeToolName(hubToolNameFromPart(part))) continue;
      const id = part.toolCallId ?? "";
      const input = parseProposeEvidenceChangeInput(part.input);
      const output = parseProposeEvidenceChangeOutput(part.output);
      if (id && id === toolCallId) {
        const key =
          evidenceEntityKey(input?.kind, input?.id) ?? evidenceEntityKey(output?.kind, output?.id);
        return key != null && settled.has(key);
      }
      if (output?.action !== "confirm" && output?.action !== "cancel") continue;
      const fromOut = evidenceEntityKey(output.kind, output.id);
      if (fromOut) settled.add(fromOut);
      const fromIn = evidenceEntityKey(input?.kind, input?.id);
      if (fromIn && !fromIn.endsWith(":__create__")) settled.add(fromIn);
    }
  }
  return false;
}

/**
 * True when an earlier evidence card this turn is still waiting. Keep the
 * first File Diff; parallel siblings (six stack cards) must not lock or show.
 */
export function isExtraWaitingEvidenceCard(messages: UIMessage[], toolCallId: string): boolean {
  let afterLatestUser = false;
  let sawEarlierWaiting = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawEarlierWaiting = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      if (!isProposeEvidenceChangeToolName(hubToolNameFromPart(part))) continue;
      if (parseProposeEvidenceChangeOutput(part.output)) continue;
      if (!isHubToolWaitingState(part.state)) continue;
      const id = part.toolCallId ?? "";
      if (id && id === toolCallId) return sawEarlierWaiting;
      if (id) sawEarlierWaiting = true;
    }
  }
  return false;
}

export function isLaterTriageAfterConfirm(messages: UIMessage[], toolCallId: string): boolean {
  let afterLatestUser = false;
  let sawConfirm = false;
  for (const message of messages) {
    if (message.role === "user") {
      afterLatestUser = true;
      sawConfirm = false;
      continue;
    }
    if (!afterLatestUser || message.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      if (!isProposeNewJobsTriageToolName(hubToolNameFromPart(part))) continue;
      const id = part.toolCallId ?? "";
      const output = parseProposeNewJobsTriageOutput(part.output);
      if (id && id === toolCallId) return sawConfirm;
      if (output?.action === "confirm") sawConfirm = true;
    }
  }
  return sawConfirm;
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

export function parseProposeHardPreferenceChangeInput(
  input: unknown
): ProposeHardPreferenceChangeInput | null {
  const parsed = ProposeHardPreferenceChangeInputSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function parseProposeHardPreferenceChangeOutput(
  output: unknown
): ProposeHardPreferenceChangeOutput | null {
  const parsed = ProposeHardPreferenceChangeOutputSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}

export function parseProposeEvidenceChangeInput(input: unknown): ProposeEvidenceChangeInput | null {
  const parsed = ProposeEvidenceChangeInputSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function parseProposeEvidenceChangeOutput(
  output: unknown
): ProposeEvidenceChangeOutput | null {
  const parsed = ProposeEvidenceChangeOutputSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}

export function parseProposeMailCrmChangeInput(input: unknown): ProposeMailCrmChangeInput | null {
  const parsed = ProposeMailCrmChangeInputSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function parseProposeMailCrmChangeOutput(
  output: unknown
): ProposeMailCrmChangeOutput | null {
  const parsed = ProposeMailCrmChangeOutputSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
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
 * Only lock the composer when a visible approval or a JD/triage/hard-stop/form
 * /evidence choice remains. `open-surface`, `find-jobs-now`, and `get-search-brief`
 * auto-complete — they are not user choices.
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
      if (isLaterTriageAfterConfirm(messages, part.toolCallId ?? "")) continue;
      return "client";
    }
    if (isProposeHardPreferenceChangeToolName(name)) {
      if (parseProposeHardPreferenceChangeOutput(part.output)) continue;
      if (isLaterHardStopAfterConfirm(messages, part.toolCallId ?? "")) continue;
      if (parseProposeHardPreferenceChangeInput(part.input)) return "client";
      // Unparseable streaming leftovers must not lock; finished args show Cancel.
      if (part.state === "input-available" || part.state === "call") return "client";
      continue;
    }
    if (isProposeEvidenceChangeToolName(name)) {
      if (parseProposeEvidenceChangeOutput(part.output)) continue;
      const id = part.toolCallId ?? "";
      // Same kind+id after Confirm is a leftover, not the next entity.
      if (isLaterEvidenceAfterSameEntityConfirm(messages, id)) continue;
      // Parallel extras this turn — first waiting card owns the composer.
      if (isExtraWaitingEvidenceCard(messages, id)) continue;
      return "client";
    }
    if (isOpenEntityFormToolName(name)) {
      if (parseOpenEntityFormOutput(part.output)) continue;
      return "client";
    }
    if (isProposeMailCrmChangeToolName(name)) {
      if (parseProposeMailCrmChangeOutput(part.output)) continue;
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
