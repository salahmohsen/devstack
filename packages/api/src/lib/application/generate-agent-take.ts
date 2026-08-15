import { assessAgentTakeReadiness, llmLogFields, type RuntimeLlmConfig } from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  jobPreferenceRepository,
  type ApplicationEntity
} from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { agentFetch } from "#@/lib/agent/agent-fetch";
import { agentGenerateBody } from "#@/lib/agent/agent-generate-body";
import { extractTextFromAgentBody } from "#@/lib/agent/parse-agent-generate";
import { ensureSessionTokenForUser } from "#@/lib/agent/resolve-session-token";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

const AGENT_ID = "job-agent-take";
const TIMEOUT_MS = 45_000;

export type GenerateAgentTakeErrorCode =
  | "NOT_FOUND"
  | "AI_NOT_CONFIGURED"
  | "AGENT_FAILED"
  | "INSUFFICIENT_LISTING";

export type GenerateAgentTakeResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: GenerateAgentTakeErrorCode; message?: string };

export type GenerateAgentTakeTextResult =
  | { ok: true; text: string }
  | { ok: false; code: Exclude<GenerateAgentTakeErrorCode, "NOT_FOUND">; message?: string };

export type AgentTakeJobInput = {
  title: string;
  companyName: string;
  location: string | null;
  employmentType: string | null;
  salaryRange: string | null;
  matchScore: number | null;
  description: string | null;
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
    description: (job.description ?? "").slice(0, 2500) || null
  };
  return `Write the agent take for this job.

Job (JSON):
${JSON.stringify(listing, null, 2)}

Match reasons (if any):
${matchReasons.length > 0 ? matchReasons.map((r) => `- ${r}`).join("\n") : "(none)"}

Seeker preferences summary:
${prefsSummary ?? "(not set)"}

Reply with 1–3 sentences only.`;
}

function prefsSummaryFromRow(
  prefs: {
    roleKeywords: string[] | null;
    locations: string[] | null;
    workModes: string[] | null;
    minMatchScore: number | null;
    salaryMin: number | null;
  } | null
): string | null {
  if (!prefs) return null;
  return JSON.stringify({
    roleKeywords: prefs.roleKeywords,
    locations: prefs.locations,
    workModes: prefs.workModes,
    minMatchScore: prefs.minMatchScore,
    salaryMin: prefs.salaryMin
  });
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

  const prefsSummary =
    input.prefsSummary !== undefined
      ? input.prefsSummary
      : prefsSummaryFromRow(await jobPreferenceRepository.findByUserId(input.userId));
  const prompt = buildPrompt(input.job, prefsSummary, input.matchReasons);
  const byo = llmLogFields(llm);

  try {
    const sessionToken = await ensureSessionTokenForUser(input.userId);
    const response = await agentFetch(`/api/agents/${encodeURIComponent(AGENT_ID)}/generate`, {
      method: "POST",
      body: JSON.stringify(
        agentGenerateBody({
          messages: [{ role: "user", content: prompt }],
          llm,
          modelSettings: { maxOutputTokens: 220, temperature: 0.4 },
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
    const take = extractTextFromAgentBody(parsed)?.replace(/\s+/g, " ").trim().slice(0, 1200);
    if (!take) {
      return { ok: false, code: "AGENT_FAILED", message: "Empty agent take response" };
    }

    log.set({
      event: "generate_agent_take_text_ok",
      takeLength: take.length,
      ...byo
    });
    log.emit();
    return { ok: true, text: take };
  } catch (err) {
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "generate_agent_take_error",
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

  const text = await generateAgentTakeText({
    userId: input.userId,
    job: {
      title: owned.title,
      companyName: owned.companyName,
      location: owned.location,
      employmentType: owned.employmentType,
      salaryRange: owned.salaryRange,
      matchScore: owned.matchScore,
      description: owned.description
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
    takeLength: text.text.length
  });
  log.emit();

  return { ok: true, application: updated };
}
