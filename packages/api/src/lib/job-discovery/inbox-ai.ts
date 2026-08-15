import { dailyAiAttemptCap } from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  userJobAiBudgetRepository
} from "@tsu-stack/db";

import { generateAgentTake } from "#@/lib/application/generate-agent-take";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { scoreApplicationMatch } from "#@/lib/application/score-application-match";
import { requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type InboxAiOutcome = "passed" | "dismissed" | "heuristic" | "skipped";

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
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

  const [prefs, llm] = await Promise.all([
    loadJobPreference(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer")
  ]);

  // No key: keep the cheap-landed stub. Do not consume daily AI budget.
  if (!llm.apiKey?.trim()) {
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
        applyMethod: owned.applyMethod
      }
    });
  } catch {
    return { outcome: "skipped" };
  }

  if (!match.passed) {
    const dismissed = await applicationRepository.setTrackingStatus(
      owned.id,
      input.userId,
      "dismissed"
    );
    if (!dismissed) return { outcome: "skipped" };

    await applicationActivityRepository.append({
      userId: input.userId,
      applicationId: owned.id,
      kind: "dismissed",
      metadata: {
        via: "low_match",
        runId: input.runId,
        score: match.score,
        reasons: match.reasons
      }
    });
    await requestJobDiscoveryLand({
      userId: input.userId,
      runId: input.runId,
      trigger: "backfill"
    });
    return { outcome: "dismissed" };
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

  return { outcome: match.source === "heuristic" ? "heuristic" : "passed" };
}
