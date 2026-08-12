import { llmLogFields } from "@tsu-stack/core";
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

export type GenerateAgentTakeErrorCode = "NOT_FOUND" | "AI_NOT_CONFIGURED" | "AGENT_FAILED";

export type GenerateAgentTakeResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: GenerateAgentTakeErrorCode; message?: string };

function buildPrompt(
  app: ApplicationEntity,
  prefsSummary: string | null,
  matchReasons: string[]
): string {
  const job = {
    title: app.title,
    companyName: app.companyName,
    location: app.location,
    employmentType: app.employmentType,
    salaryRange: app.salaryRange,
    matchScore: app.matchScore,
    description: (app.description ?? "").slice(0, 2500) || null
  };
  return `Write the agent take for this job.

Job (JSON):
${JSON.stringify(job, null, 2)}

Match reasons (if any):
${matchReasons.length > 0 ? matchReasons.map((r) => `- ${r}`).join("\n") : "(none)"}

Seeker preferences summary:
${prefsSummary ?? "(not set)"}

Reply with 1–3 sentences only.`;
}

/**
 * Generate or regenerate `application.agentTake` via the job-agent-take agent.
 */
export async function generateAgentTake(input: {
  applicationId: string;
  userId: string;
}): Promise<GenerateAgentTakeResult> {
  const log = createLogger({ operation: "api__generate_agent_take" });
  const owned = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
  if (!owned) return { ok: false, code: "NOT_FOUND" };

  const llm = await resolveRuntimeAiCredentials(input.userId, "scorer");
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

  const [prefs, activity] = await Promise.all([
    jobPreferenceRepository.findByUserId(input.userId),
    applicationActivityRepository.listByApplicationId(input.applicationId, input.userId, {
      limit: 20,
      order: "desc"
    })
  ]);

  const discovered = activity.find((a) => a.kind === "discovered");
  const meta = (discovered?.metadata ?? {}) as Record<string, unknown>;
  const matchReasons = Array.isArray(meta.matchReasons)
    ? meta.matchReasons.filter((r): r is string => typeof r === "string")
    : [];

  const prefsSummary = prefs
    ? JSON.stringify({
        roleKeywords: prefs.roleKeywords,
        locations: prefs.locations,
        workModes: prefs.workModes,
        minMatchScore: prefs.minMatchScore,
        salaryMin: prefs.salaryMin
      })
    : null;

  const prompt = buildPrompt(owned, prefsSummary, matchReasons);
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
        applicationId: input.applicationId,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return { ok: false, code: "AGENT_FAILED", message: "Agent worker unreachable" };
    }

    const bodyText = await response.text().catch(() => "");
    if (!response.ok) {
      log.error(new Error(`agent take ${response.status}`), {
        event: "generate_agent_take_failed",
        applicationId: input.applicationId,
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

    const updated = await applicationRepository.update(input.applicationId, input.userId, {
      agentTake: take
    });
    if (!updated) return { ok: false, code: "NOT_FOUND" };

    log.set({
      event: "generate_agent_take_ok",
      applicationId: input.applicationId,
      takeLength: take.length,
      ...byo
    });
    log.emit();

    return { ok: true, application: updated };
  } catch (err) {
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "generate_agent_take_error",
      applicationId: input.applicationId,
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
