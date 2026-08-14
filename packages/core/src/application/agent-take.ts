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
