/** Minimum cleaned description length for a real posting body (not a title restatement). */
export const AGENT_TAKE_MIN_DESCRIPTION_CHARS = 280;

const FETCH_FAILURE_DESCRIPTION_RE =
  /job details were not accessible|redirected to a login|sign[- ]?in to (view|continue|see|linkedin)|please (sign|log) in|log ?in (required|to (view|continue))|authentication required|could not (fetch|load|access) (the )?(job|listing|page)/i;

const EMPTY_COMPANY_RE = /^(unknown|n\/?a|none|null|-|—)$/i;

export type AgentTakeListing = {
  title?: string | null;
  companyName?: string | null;
  location?: string | null;
  employmentType?: string | null;
  salaryRange?: string | null;
  description?: string | null;
};

export type AgentTakeReadinessReason = "thin_description" | "login_walled" | "thin_metadata";

export type AgentTakeReadiness =
  | { ok: true }
  | { ok: false; reason: AgentTakeReadinessReason; message: string };

function nonempty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function hasCompany(value: string | null | undefined): boolean {
  const company = nonempty(value);
  return company.length > 0 && !EMPTY_COMPANY_RE.test(company);
}

function hasExtraMetadata(listing: AgentTakeListing): boolean {
  if (nonempty(listing.location).length > 0) return true;
  if (nonempty(listing.salaryRange).length > 0) return true;
  const employment = nonempty(listing.employmentType);
  return employment.length > 0 && employment !== "unknown";
}

/** True when the description is a login-wall / fetch-failure stub, not a job posting. */
export function isInsufficientJobDescriptionStub(description: string | null | undefined): boolean {
  const text = nonempty(description);
  if (!text) return false;
  return FETCH_FAILURE_DESCRIPTION_RE.test(text);
}

/**
 * Agent take needs a real job body plus listing identity (title, company, and
 * at least one of location / employment / salary). Login-wall stubs fail even
 * when they mention the role title.
 */
export function assessAgentTakeReadiness(listing: AgentTakeListing): AgentTakeReadiness {
  const title = nonempty(listing.title);
  const description = nonempty(listing.description);

  if (isInsufficientJobDescriptionStub(description)) {
    return {
      ok: false,
      reason: "login_walled",
      message:
        "This listing looks like a login wall or fetch stub. Refresh the posting URL or paste the job description, then try again."
    };
  }

  if (description.length < AGENT_TAKE_MIN_DESCRIPTION_CHARS) {
    return {
      ok: false,
      reason: "thin_description",
      message:
        "Need a fuller job description (responsibilities and requirements) before the agent can write a take."
    };
  }

  if (!title || !hasCompany(listing.companyName) || !hasExtraMetadata(listing)) {
    return {
      ok: false,
      reason: "thin_metadata",
      message:
        "Need company plus location, employment type, or salary before the agent can write a take."
    };
  }

  return { ok: true };
}

export function canGenerateAgentTake(listing: AgentTakeListing): boolean {
  return assessAgentTakeReadiness(listing).ok;
}

const EM_OR_EN_DASH = /\s*[—–]\s*/g;
const BULLET_LINE = /^\s*[-*]\s+(.*)$/;

function stripEmDashes(text: string): string {
  return text.replace(EM_OR_EN_DASH, ", ");
}

/**
 * Persist agent take as a markdown list: at most 5 bullets, never sliced
 * mid-bullet. Paragraphs with no markers become a single bullet.
 */
export function normalizeAgentTakeText(text: string): string {
  const trimmed = stripEmDashes(text).replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  const bullets: string[] = [];
  for (const line of trimmed.split("\n")) {
    const match = line.match(BULLET_LINE);
    if (!match) continue;
    const body = match[1]?.trim() ?? "";
    if (body) bullets.push(body);
  }

  let points = bullets;
  if (points.length === 0) {
    const para =
      trimmed
        .split(/\n\s*\n/)[0]
        ?.replace(/\s+/g, " ")
        .trim() ?? "";
    if (para) points = [para];
  }
  points = points.slice(0, 5);
  if (points.length === 0) return "";

  let lines = points.map((point) => `- ${point}`);
  let joined = lines.join("\n");
  while (joined.length > 1200 && lines.length > 1) {
    lines = lines.slice(0, -1);
    joined = lines.join("\n");
  }
  return joined;
}
