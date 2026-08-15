import { randomUUID } from "node:crypto";

import {
  computeLandBudget,
  countTwoAxisPassedUnseen,
  dailyAiAttemptCap,
  FindJobsNowInputSchema,
  FindJobsNowOutputSchema,
  hasValidDiscoveryTitle,
  ingestQueryKey,
  MAX_OPEN_INBOX,
  type JobPreference
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

/** Unseen catalog rows that survive cheap + $0 two-axis, up to `budget`. */
async function countTwoAxisUnseenShelf(input: {
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
  return countTwoAxisPassedUnseen(shelf, input.prefs, input.budget);
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
      if (budget === 0) {
        return {
          enqueued: false,
          ingestTriggered: false,
          seats,
          reason: "ai_budget"
        };
      }

      const runId = `find_${userId}_${randomUUID()}`;
      const twoAxisUnseen = await countTwoAxisUnseenShelf({ userId, prefs, budget });
      const ingestTriggered = twoAxisUnseen < budget;
      const queryKey =
        ingestQueryKey({
          titleId: prefs.titleId,
          customTitle: prefs.customTitle,
          roleKeywords: prefs.roleKeywords
        }) ?? undefined;

      const enqueued = ingestTriggered
        ? await requestJobCatalogIngest({ mode: "user_query", userId, runId, queryKey })
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
