import {
  AiJobMatchBatchSchema,
  applyPreferenceHardFails,
  formatJobMatchScorePrompt,
  resolveMatchLandDecision,
  SCORER_JOB_DESCRIPTION_CHARS,
  scoreJobAgainstPreference,
  shouldPassAllHarvestJobs,
  type ApplicationApplyMethod,
  type HarvestedJob,
  type RuntimeLlmConfig,
  type WorkMode
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { agentFetch } from "#@/lib/agent/agent-fetch";
import { agentGenerateBody } from "#@/lib/agent/agent-generate-body";
import { ensureSessionTokenForUser } from "#@/lib/agent/resolve-session-token";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { loadSeekerMatchEvidence } from "#@/lib/application/load-seeker-match-evidence";
import { ensureSearchBrief } from "#@/lib/application/search-brief";

const SCORER_AGENT_ID = "job-preference-match-scorer";
const TIMEOUT_MS = 60_000;

export type ApplicationMatchScoreResult = {
  score: number;
  passed: boolean;
  reasons: string[];
  source: "ai" | "heuristic";
  rulesFailed: boolean;
};

function toHarvestedJob(job: {
  listingUrl: string;
  title: string;
  companyName: string;
  location: string | null;
  salaryRange: string | null;
  description: string | null;
  applyMethod?: string | null;
  workMode?: WorkMode | null;
}): HarvestedJob {
  return {
    title: job.title,
    companyName: job.companyName,
    location: job.location,
    salaryRange: job.salaryRange,
    description: job.description,
    listingUrl: job.listingUrl,
    applyUrl: null,
    applyMethod: (job.applyMethod as ApplicationApplyMethod | null | undefined) ?? "unknown",
    workMode: job.workMode ?? null,
    source: null
  };
}

function extractMatchObject(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const rec = body as Record<string, unknown>;
  if (rec.object != null) return rec.object;
  if (rec.result && typeof rec.result === "object") {
    const r = rec.result as Record<string, unknown>;
    if (r.object != null) return r.object;
  }
  if ("matches" in rec) return rec;
  if (typeof rec.text === "string" && rec.text.trim()) {
    try {
      return JSON.parse(rec.text.trim());
    } catch {
      const fence = rec.text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence?.[1]) {
        try {
          return JSON.parse(fence[1].trim());
        } catch {
          return null;
        }
      }
    }
  }
  return rec;
}

/**
 * Score one job against the seeker's JobPreference.
 * Prefers AI scorer (same agent as harvest); falls back to rules-only scoring.
 */
export async function scoreApplicationMatch(input: {
  userId: string;
  llm: RuntimeLlmConfig;
  job: {
    listingUrl: string;
    title: string;
    companyName: string;
    location: string | null;
    salaryRange: string | null;
    description: string | null;
    applyMethod?: string | null;
    workMode?: WorkMode | null;
  };
}): Promise<ApplicationMatchScoreResult> {
  const [prefs, evidence] = await Promise.all([
    loadJobPreference(input.userId),
    loadSeekerMatchEvidence(input.userId)
  ]);
  const harvested = toHarvestedJob(input.job);
  const minScore = prefs.minMatchScore ?? 60;
  const passAll = shouldPassAllHarvestJobs(prefs, evidence);

  const hard = applyPreferenceHardFails(harvested, prefs);
  if (hard.failed) {
    return {
      score: 0,
      passed: false,
      reasons: hard.reasons,
      source: "heuristic",
      rulesFailed: true
    };
  }

  const heuristic = scoreJobAgainstPreference(harvested, prefs, evidence);

  if (!ENV_SERVER.AGENT_WORKER_URL?.trim() || !input.llm.apiKey?.trim()) {
    return {
      score: heuristic.score,
      passed: passAll ? true : heuristic.passed,
      reasons: [...heuristic.reasons, "heuristic_only"],
      source: "heuristic",
      rulesFailed: heuristic.rulesFailed
    };
  }

  const jobsJson = [
    {
      listingUrl: input.job.listingUrl,
      title: input.job.title,
      companyName: input.job.companyName,
      location: input.job.location,
      workMode: input.job.workMode ?? null,
      applyMethod: input.job.applyMethod ?? "unknown",
      salaryRange: input.job.salaryRange,
      description: (input.job.description ?? "").slice(0, SCORER_JOB_DESCRIPTION_CHARS) || null
    }
  ];

  const brief = await ensureSearchBrief(input.userId).catch(() => null);
  const prompt = formatJobMatchScorePrompt({
    prefs,
    evidence,
    jobs: jobsJson,
    minScore,
    searchBriefMarkdown: brief?.markdown ?? null
  });

  try {
    const sessionToken = await ensureSessionTokenForUser(input.userId);
    const response = await agentFetch(
      `/api/agents/${encodeURIComponent(SCORER_AGENT_ID)}/generate`,
      {
        method: "POST",
        body: JSON.stringify(
          agentGenerateBody({
            messages: [{ role: "user", content: prompt }],
            llm: input.llm,
            requestContext: { userId: input.userId },
            modelSettings: { maxOutputTokens: 800, temperature: 0.2 },
            extras: {
              structuredOutput: {
                schema: {
                  type: "object",
                  properties: {
                    matches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          listingUrl: { type: "string" },
                          score: { type: "number" },
                          passed: { type: "boolean" },
                          reasons: { type: "array", items: { type: "string" } }
                        },
                        required: ["listingUrl", "score", "passed"]
                      }
                    }
                  },
                  required: ["matches"]
                }
              }
            }
          })
        ),
        timeoutMs: TIMEOUT_MS,
        sessionToken,
        retry: true
      }
    );

    if (!response?.ok) {
      return {
        score: heuristic.score,
        passed: passAll ? true : heuristic.passed,
        reasons: [...heuristic.reasons, "ai_scorer_http_fallback"],
        source: "heuristic",
        rulesFailed: heuristic.rulesFailed
      };
    }

    const bodyText = await response.text().catch(() => "");
    let parsedJson: unknown = null;
    try {
      parsedJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsedJson = { text: bodyText };
    }

    const batch = AiJobMatchBatchSchema.safeParse(extractMatchObject(parsedJson));
    if (!batch.success || batch.data.matches.length === 0) {
      return {
        score: heuristic.score,
        passed: passAll ? true : heuristic.passed,
        reasons: [...heuristic.reasons, "ai_scorer_parse_fallback"],
        source: "heuristic",
        rulesFailed: heuristic.rulesFailed
      };
    }

    const hit =
      batch.data.matches.find(
        (m) => m.listingUrl.toLowerCase() === input.job.listingUrl.toLowerCase()
      ) ?? batch.data.matches[0]!;

    const land = resolveMatchLandDecision({
      minScore,
      passAll,
      aiScore: hit.score
    });

    return {
      score: land.score,
      passed: land.passed,
      reasons: [
        ...(hit.reasons?.length ? hit.reasons : ["ai_match"]),
        ...(passAll ? ["open_preference_profile"] : [])
      ],
      source: "ai",
      rulesFailed: false
    };
  } catch {
    return {
      score: heuristic.score,
      passed: passAll ? true : heuristic.passed,
      reasons: [...heuristic.reasons, "ai_scorer_error_fallback"],
      source: "heuristic",
      rulesFailed: heuristic.rulesFailed
    };
  }
}
