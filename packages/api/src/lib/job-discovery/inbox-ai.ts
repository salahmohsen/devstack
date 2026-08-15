import {
  dailyAiAttemptCap,
  isThinJobDescription,
  WorkModeSchema,
  type WorkMode
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  jobPostingRepository,
  userJobAiBudgetRepository
} from "@tsu-stack/db";

import { generateAgentTake } from "#@/lib/application/generate-agent-take";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { scoreApplicationMatch } from "#@/lib/application/score-application-match";
import { requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type InboxAiOutcome = "passed" | "dismissed" | "heuristic" | "skipped";

/**
 * Soft AI failure (heuristic fallback) must not auto-dismiss.
 * minMatchScore is the AI bar; cheap already passed at land.
 */
export function decideInboxAiKeep(match: {
  passed: boolean;
  source: "ai" | "heuristic";
}): "passed" | "dismissed" | "heuristic" {
  if (match.source === "heuristic") return "heuristic";
  return match.passed ? "passed" : "dismissed";
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function asWorkMode(value: string | null | undefined): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function dismissInboxAndBackfill(input: {
  userId: string;
  applicationId: string;
  runId: string;
  via: "low_match" | "score_error";
  score: number | null;
  reasons: string[];
}): Promise<"dismissed" | "skipped"> {
  const dismissed = await applicationRepository.setTrackingStatus(
    input.applicationId,
    input.userId,
    "dismissed"
  );
  if (!dismissed) return "skipped";

  await applicationActivityRepository.append({
    userId: input.userId,
    applicationId: input.applicationId,
    kind: "dismissed",
    metadata: {
      via: input.via,
      runId: input.runId,
      score: input.score,
      reasons: input.reasons
    }
  });
  await requestJobDiscoveryLand({
    userId: input.userId,
    runId: input.runId,
    trigger: "backfill"
  });
  return "dismissed";
}

export async function runInboxAi(input: {
  userId: string;
  applicationId: string;
  runId: string;
}): Promise<{ outcome: InboxAiOutcome }> {
  const owned = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
  if (!owned || owned.trackingStatus !== "inbox") {
    return { outcome: "skipped" };
  }

  const [prefs, llm, posting] = await Promise.all([
    loadJobPreference(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer"),
    owned.postingId ? jobPostingRepository.findById(owned.postingId) : Promise.resolve(null)
  ]);

  // No key or thin JD: keep the cheap-landed stub. Do not consume daily AI budget.
  if (!llm.apiKey?.trim() || isThinJobDescription(owned.description)) {
    return { outcome: "heuristic" };
  }

  const reserved = await userJobAiBudgetRepository.tryIncrement(
    input.userId,
    utcDay(),
    dailyAiAttemptCap(prefs.jobsPerRun)
  );
  if (!reserved) {
    return { outcome: "skipped" };
  }

  let match;
  try {
    match = await scoreApplicationMatch({
      userId: input.userId,
      llm,
      job: {
        listingUrl: owned.url ?? "",
        title: owned.title,
        companyName: owned.companyName,
        location: owned.location,
        salaryRange: owned.salaryRange,
        description: owned.description,
        applyMethod: owned.applyMethod,
        workMode: asWorkMode(posting?.workMode)
      }
    });
  } catch (error) {
    // Attempt already consumed — dismiss so this stub cannot occupy N forever.
    return {
      outcome: await dismissInboxAndBackfill({
        userId: input.userId,
        applicationId: owned.id,
        runId: input.runId,
        via: "score_error",
        score: owned.matchScore,
        reasons: [
          "score_error",
          error instanceof Error ? error.message : "scoreApplicationMatch threw"
        ]
      })
    };
  }

  const decision = decideInboxAiKeep(match);
  if (decision === "dismissed") {
    return {
      outcome: await dismissInboxAndBackfill({
        userId: input.userId,
        applicationId: owned.id,
        runId: input.runId,
        via: "low_match",
        score: match.score,
        reasons: match.reasons
      })
    };
  }

  if (decision === "heuristic") {
    // Soft AI failure did not judge the JD — do not burn the 2×N cap.
    await userJobAiBudgetRepository.tryDecrement(input.userId, utcDay());
    return { outcome: "heuristic" };
  }

  await applicationRepository.update(owned.id, input.userId, {
    matchScore: match.score
  });

  try {
    await generateAgentTake({
      applicationId: owned.id,
      userId: input.userId
    });
  } catch {
    // Soft-fail: leave agentTake null. Do not retrigger land.
  }

  return { outcome: "passed" };
}
