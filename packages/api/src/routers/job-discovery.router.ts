import { randomUUID } from "node:crypto";

import {
  computeLandBudget,
  dailyAiAttemptCap,
  FindJobsNowInputSchema,
  FindJobsNowOutputSchema,
  hasValidDiscoveryTitle,
  MAX_OPEN_INBOX,
  scoreCatalogAgainstPreference,
  WorkModeSchema,
  type JobPreference,
  type WorkMode
} from "@tsu-stack/core";
import {
  applicationRepository,
  jobPostingRepository,
  userJobAiBudgetRepository
} from "@tsu-stack/db/repositories";

import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { requestJobCatalogIngest, requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { protectedProcedure } from "#@/lib/procedures/factory";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function asWorkMode(value: string | null): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Cheap-passed unseen open catalog rows, short-circuiting once `budget` is met. */
async function countCheapPassedUnseen(input: {
  userId: string;
  prefs: JobPreference;
  budget: number;
}): Promise<number> {
  if (input.budget <= 0) return 0;

  const seen = await applicationRepository.listUserUrlsAndPostingIds(input.userId);
  const shelf = await jobPostingRepository.listOpenForLand({
    excludeUrls: seen.urls,
    excludePostingIds: seen.postingIds
  });

  let passed = 0;
  for (const posting of shelf) {
    const cheap = scoreCatalogAgainstPreference(
      {
        title: posting.title,
        companyName: posting.companyName,
        location: posting.location,
        workMode: asWorkMode(posting.workMode),
        skills: posting.skills ?? [],
        salaryMin: posting.salaryMin,
        salaryCurrency: posting.salaryCurrency
      },
      input.prefs
    );
    if (!cheap.passed) continue;
    passed += 1;
    if (passed >= input.budget) break;
  }
  return passed;
}

export const jobDiscoveryRouter = {
  findNow: protectedProcedure
    .route({
      description: "Ingest this user's query if the shelf is thin, then land",
      method: "POST"
    })
    .input(FindJobsNowInputSchema)
    .output(FindJobsNowOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const [prefs, llm] = await Promise.all([
        loadJobPreference(userId),
        resolveRuntimeAiCredentials(userId, "scorer")
      ]);

      if (
        !hasValidDiscoveryTitle({
          titleId: prefs.titleId,
          customTitle: prefs.customTitle,
          roleKeywords: prefs.roleKeywords
        })
      ) {
        return {
          enqueued: false,
          ingestTriggered: false,
          seats: 0,
          reason: "title_required"
        };
      }

      const openInbox = await applicationRepository.countByUserIdAndTrackingStatus(userId, "inbox");
      const seats = Math.max(0, MAX_OPEN_INBOX - openInbox);
      if (seats === 0) {
        return {
          enqueued: false,
          ingestTriggered: false,
          seats: 0,
          reason: "inbox_full"
        };
      }

      // Enqueue only — ingest/land workers run asynchronously. Never await the model.
      const hasAiKey = Boolean(llm.apiKey?.trim());
      const remainingDailyAiAttempts = hasAiKey
        ? await userJobAiBudgetRepository.remainingAttempts(
            userId,
            utcDay(),
            dailyAiAttemptCap(prefs.jobsPerRun)
          )
        : 0;
      const budget = computeLandBudget({
        jobsPerRun: prefs.jobsPerRun,
        openInbox,
        inboxThisRun: 0,
        remainingDailyAiAttempts,
        hasAiKey
      });

      const runId = `find_${userId}_${randomUUID()}`;
      const cheapUnseen = await countCheapPassedUnseen({ userId, prefs, budget });
      const ingestTriggered = cheapUnseen < budget;

      const enqueued = ingestTriggered
        ? await requestJobCatalogIngest({ mode: "user_query", userId, runId })
        : await requestJobDiscoveryLand({
            userId,
            runId,
            trigger: "find_now"
          });

      if (!enqueued) {
        return {
          enqueued: false,
          ingestTriggered,
          seats,
          reason: "queue_unavailable"
        };
      }

      return {
        enqueued: true,
        ingestTriggered,
        seats,
        reason: "ok"
      };
    })
};
