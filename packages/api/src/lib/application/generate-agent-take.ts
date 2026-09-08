import {
  applyYearsCap,
  assessAgentTakeReadiness,
  canonicalizeListingSkillNames,
  classifyJobSkills,
  formatSearchBriefForPrompt,
  formatSeekerEvidenceForPrompt,
  llmLogFields,
  mergeExperienceYears,
  normalizeAgentTakeText,
  type JobPreference,
  type RuntimeLlmConfig,
  type SeekerMatchEvidence
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  experienceRepository,
  stackRepository,
  type ApplicationEntity
} from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { agentFetch } from "#@/lib/agent/agent-fetch";
import { agentGenerateBody } from "#@/lib/agent/agent-generate-body";
import {
  agentGenerateFinishReason,
  extractTextFromAgentBody
} from "#@/lib/agent/parse-agent-generate";
import { ensureSessionTokenForUser } from "#@/lib/agent/resolve-session-token";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { loadSeekerMatchEvidence } from "#@/lib/application/load-seeker-match-evidence";
import { ensureSearchBrief } from "#@/lib/application/search-brief";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

const AGENT_ID = "job-agent-take";
const TIMEOUT_MS = 45_000;
/**
 * Thinking models (MiniMax, DeepSeek-R1, omen-alpha) spend reasoning budget
 * first — the 2026-09-07 live run burned 1200/1200 tokens on reasoning and
 * returned text=0. Budget must cover reasoning plus the <800 char take.
 */
const TAKE_MAX_OUTPUT_TOKENS = 6_000;

export type GenerateAgentTakeErrorCode =
  | "NOT_FOUND"
  | "AI_NOT_CONFIGURED"
  | "AGENT_FAILED"
  | "INSUFFICIENT_LISTING";

export type GenerateAgentTakeResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: GenerateAgentTakeErrorCode; message?: string };

export type GenerateAgentTakeTextResult =
  | { ok: true; text: string; hasBrief: boolean }
  | { ok: false; code: Exclude<GenerateAgentTakeErrorCode, "NOT_FOUND">; message?: string };

export type AgentTakeSkillsMatch = {
  have: string[];
  close: { name: string; via: string }[];
  missing: string[];
  percent: number | null;
};

export type AgentTakeJobInput = {
  title: string;
  companyName: string;
  location: string | null;
  employmentType: string | null;
  salaryRange: string | null;
  matchScore: number | null;
  description: string | null;
  experienceYearsMin?: number | null;
  seekerYears?: number | null;
  yearsCapped?: boolean;
  skillsMatch?: AgentTakeSkillsMatch | null;
};

function buildPrompt(
  job: AgentTakeJobInput,
  prefsSummary: string | null,
  matchReasons: string[]
): string {
  const listing = {
    title: job.title,
    companyName: job.companyName,
    location: job.location,
    employmentType: job.employmentType,
    salaryRange: job.salaryRange,
    matchScore: job.matchScore,
    experienceYearsMin: job.experienceYearsMin ?? null,
    seekerYears: job.seekerYears ?? null,
    yearsCapped: job.yearsCapped ?? false,
    description: (job.description ?? "").slice(0, 2500) || null
  };
  return `Write the agent take for this job as markdown only.

Rules:
- Maximum 5 bullets. Prefer 3-5. One short point per bullet.
- Optional one-line heading at most. No JSON, no preamble paragraph.
- Ground in listing fields, match reasons, prefs, years, and skills when provided.
- If yearsCapped is true, say the listing asks experienceYearsMin years.
- Column hard-fails (exclude, level floor, salary, years cap) are law; mention them when they fired.
- Plain words. Short sentences. is/are/has. No hype, no pivotal/landscape/delve, no em dashes.
- Do not invent employers, skills, or years.
- If fit is weak, say so. Do not sell the job.
- Prefer under 800 characters.
- Skills chips (deterministic; do not recompute or invent tools):
${JSON.stringify(job.skillsMatch ?? null)}
- Do not list dropped role phrases as missing skills.
- You may mention the role (e.g. frontend) only if Have chips support it.

Job (JSON):
${JSON.stringify(listing, null, 2)}

Match reasons (if any):
${matchReasons.length > 0 ? matchReasons.map((r) => `- ${r}`).join("\n") : "(none)"}

Seeker preferences summary:
${prefsSummary ?? "(not set)"}`;
}

type TakePrefsColumns = Pick<
  JobPreference,
  "roleKeywords" | "workModes" | "salaryMin" | "salaryCurrency" | "minMatchScore"
>;

export function prefsSummaryFromRow(
  prefs: TakePrefsColumns | null,
  evidence?: SeekerMatchEvidence | null,
  searchBriefMarkdown?: string | null
): string | null {
  if (!prefs && !evidence && !searchBriefMarkdown?.trim()) return null;
  const columns = {
    roleKeywords: prefs?.roleKeywords ?? [],
    workModes: prefs?.workModes ?? [],
    salaryMin: prefs?.salaryMin ?? null,
    salaryCurrency: prefs?.salaryCurrency ?? null,
    minMatchScore: prefs?.minMatchScore ?? null
  };
  return [
    `JobPreference columns (law):
${JSON.stringify(columns, null, 2)}`,
    formatSeekerEvidenceForPrompt(evidence),
    formatSearchBriefForPrompt(searchBriefMarkdown)
  ].join("\n\n");
}

async function loadTakePromptContext(userId: string): Promise<{
  prefsSummary: string | null;
  hasBrief: boolean;
}> {
  const [prefs, evidence, brief] = await Promise.all([
    loadJobPreference(userId),
    loadSeekerMatchEvidence(userId),
    ensureSearchBrief(userId).catch(() => null)
  ]);
  const searchBriefMarkdown = brief?.markdown ?? null;
  return {
    prefsSummary: prefsSummaryFromRow(prefs, evidence, searchBriefMarkdown),
    hasBrief: Boolean(searchBriefMarkdown?.trim())
  };
}

/**
 * Produce take text without an application row (evaluate-then-insert).
 */
export async function generateAgentTakeText(input: {
  userId: string;
  job: AgentTakeJobInput;
  matchReasons: string[];
  prefsSummary?: string | null;
  llm?: RuntimeLlmConfig;
}): Promise<GenerateAgentTakeTextResult> {
  const log = createLogger({ operation: "api__generate_agent_take" });
  const readiness = assessAgentTakeReadiness(input.job);
  if (!readiness.ok) {
    return { ok: false, code: "INSUFFICIENT_LISTING", message: readiness.message };
  }

  const llm = input.llm ?? (await resolveRuntimeAiCredentials(input.userId, "scorer"));
  if (!llm.apiKey) {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "Configure a BYO API key under Settings → AI"
    };
  }
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "Agent worker is not configured"
    };
  }

  const takeCtx =
    input.prefsSummary !== undefined
      ? { prefsSummary: input.prefsSummary, hasBrief: false }
      : await loadTakePromptContext(input.userId);
  const prompt = buildPrompt(input.job, takeCtx.prefsSummary, input.matchReasons);
  const byo = llmLogFields(llm);
  const injectFlags = { hasBrief: takeCtx.hasBrief };

  try {
    const sessionToken = await ensureSessionTokenForUser(input.userId);
    const response = await agentFetch(`/api/agents/${encodeURIComponent(AGENT_ID)}/generate`, {
      method: "POST",
      body: JSON.stringify(
        agentGenerateBody({
          messages: [{ role: "user", content: prompt }],
          llm,
          modelSettings: { maxOutputTokens: TAKE_MAX_OUTPUT_TOKENS, temperature: 0.4 },
          requestContext: { userId: input.userId }
        })
      ),
      timeoutMs: TIMEOUT_MS,
      sessionToken,
      retry: true
    });

    if (!response) {
      log.error(new Error("agent take unreachable"), {
        event: "generate_agent_take_unreachable",
        ...injectFlags,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return { ok: false, code: "AGENT_FAILED", message: "Agent worker unreachable" };
    }

    const bodyText = await response.text().catch(() => "");
    if (!response.ok) {
      log.error(new Error(`agent take ${response.status}`), {
        event: "generate_agent_take_failed",
        status: response.status,
        bodyPreview: bodyText.slice(0, 200),
        ...injectFlags,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        code: "AGENT_FAILED",
        message: `Agent take failed (${response.status})`
      };
    }

    let parsed: unknown = null;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsed = { text: bodyText };
    }
    const take = normalizeAgentTakeText(extractTextFromAgentBody(parsed) ?? "");
    if (!take) {
      const finishReason = agentGenerateFinishReason(parsed);
      log.error(new Error("agent take empty"), {
        event: "generate_agent_take_empty",
        finishReason,
        bodyKeys:
          parsed && typeof parsed === "object" ? Object.keys(parsed as object).slice(0, 16) : [],
        bodyPreview: bodyText.slice(0, 280),
        ...injectFlags,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        code: "AGENT_FAILED",
        message:
          finishReason === "length"
            ? "The model used its output budget on thinking and returned no take. Try again."
            : "Empty agent take response"
      };
    }

    log.set({
      event: "generate_agent_take_text_ok",
      takeLength: take.length,
      ...injectFlags,
      ...byo
    });
    log.emit();
    return { ok: true, text: take, ...injectFlags };
  } catch (err) {
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "generate_agent_take_error",
      ...injectFlags,
      ...byo
    });
    log.emit({ _forceKeep: true });
    return {
      ok: false,
      code: "AGENT_FAILED",
      message: err instanceof Error ? err.message : "Agent take failed"
    };
  }
}

/**
 * Generate or regenerate `application.agentTake` via the job-agent-take agent.
 */
export async function generateAgentTake(input: {
  applicationId: string;
  userId: string;
}): Promise<GenerateAgentTakeResult> {
  const owned = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
  if (!owned) return { ok: false, code: "NOT_FOUND" };

  const activity = await applicationActivityRepository.listByApplicationId(
    input.applicationId,
    input.userId,
    { limit: 20, order: "desc" }
  );
  const discovered = activity.find((row) => row.kind === "discovered");
  const meta = (discovered?.metadata ?? {}) as Record<string, unknown>;
  const matchReasons = Array.isArray(meta.matchReasons)
    ? meta.matchReasons.filter((reason): reason is string => typeof reason === "string")
    : [];

  const [experiences, stacks] = await Promise.all([
    experienceRepository.findAllByUserId(input.userId),
    stackRepository.findAllByUserId(input.userId)
  ]);
  const seekerYears = mergeExperienceYears(experiences);
  const years = applyYearsCap({
    aiScore: owned.matchScore ?? 0,
    listingMinYears: owned.experienceYearsMin,
    seekerYears
  });
  const held = stacks.map((stack) => {
    return { id: stack.id, name: stack.name, aliases: stack.aliases ?? [] };
  });
  const jobSkills = canonicalizeListingSkillNames(
    [
      ...owned.requiredSkills.map((skill) => skill.name),
      ...owned.preferredSkills.map((skill) => skill.name)
    ],
    held
  );
  const classified = classifyJobSkills({ jobSkills, held });
  const skillsMatch: AgentTakeSkillsMatch = {
    have: classified.have,
    close: classified.close,
    missing: classified.missing,
    percent: classified.percent
  };
  const text = await generateAgentTakeText({
    userId: input.userId,
    job: {
      title: owned.title,
      companyName: owned.companyName,
      location: owned.location,
      employmentType: owned.employmentType,
      salaryRange: owned.salaryRange,
      matchScore: owned.matchScore,
      description: owned.description,
      experienceYearsMin: owned.experienceYearsMin,
      seekerYears,
      yearsCapped: owned.matchScore != null && years.capped,
      skillsMatch
    },
    matchReasons
  });
  if (!text.ok) return text;

  const updated = await applicationRepository.update(input.applicationId, input.userId, {
    agentTake: text.text
  });
  if (!updated) return { ok: false, code: "NOT_FOUND" };

  const log = createLogger({ operation: "api__generate_agent_take" });
  log.set({
    event: "generate_agent_take_ok",
    applicationId: input.applicationId,
    takeLength: text.text.length,
    hasBrief: text.hasBrief
  });
  log.emit();

  return { ok: true, application: updated };
}
