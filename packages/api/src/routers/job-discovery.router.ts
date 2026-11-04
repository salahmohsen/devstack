import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  computeLandBudget,
  dailyAiAttemptCap,
  DISCOVERY_FETCH_POOL_SIZE,
  FindJobsNowInputSchema,
  FindJobsNowOutputSchema,
  hasValidRoleQuery,
  DiscoveryStatusInputSchema,
  DiscoveryStatusOutputSchema,
  MAX_OPEN_INBOX
} from "@tsu-stack/core";
import {
  jobDiscoveryRunRepository,
  applicationRepository,
  userJobAiBudgetRepository
} from "@tsu-stack/db/repositories";

import { loadJobPreferenceOutput } from "#@/lib/application/load-job-preference";
import { requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { utcDay } from "#@/lib/job-discovery/enrollment";
import { searchFreehireCities } from "#@/lib/job-discovery/freehire/client";
import { toDiscoveryRun } from "#@/lib/job-discovery/status";
import { protectedProcedure } from "#@/lib/procedures/factory";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export const jobDiscoveryRouter = {
  status: protectedProcedure
    .route({
      description: "Read the current user's discovery progress and last successful sync",
      method: "GET"
    })
    .input(DiscoveryStatusInputSchema)
    .output(DiscoveryStatusOutputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await jobDiscoveryRunRepository.expireStale(userId);
      const [run, lastSuccessfulAt, nextScheduledAt] = await Promise.all([
        input.runId
          ? jobDiscoveryRunRepository.find(userId, input.runId)
          : jobDiscoveryRunRepository
              .findActive(userId)
              .then(async (active) => active ?? jobDiscoveryRunRepository.latest(userId)),
        jobDiscoveryRunRepository.lastSuccessful(userId),
        jobDiscoveryRunRepository.nextScheduled(userId)
      ]);
      return {
        run: run ? toDiscoveryRun(run) : null,
        lastSuccessfulAt: lastSuccessfulAt?.toISOString() ?? null,
        nextScheduledAt: nextScheduledAt?.toISOString() ?? null
      };
    }),
  findNow: protectedProcedure
    .route({
      description: "Land jobs from this user's own freehire fetch (per-user shelf)",
      method: "POST"
    })
    .input(FindJobsNowInputSchema)
    .output(FindJobsNowOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      await jobDiscoveryRunRepository.expireStale(userId);
      const active = await jobDiscoveryRunRepository.findActive(userId);
      if (active) {
        await requestJobDiscoveryLand({
          userId,
          runId: `find_${randomUUID()}`,
          trigger: "find_now"
        });
        return {
          enqueued: true,
          ingestTriggered: false,
          seats: 0,
          reason: "ok",
          runId: active.runId
        };
      }
      const [prefs, llm] = await Promise.all([
        loadJobPreferenceOutput(userId),
        resolveRuntimeAiCredentials(userId, "scorer")
      ]);

      if (!hasValidRoleQuery({ roleKeywords: prefs.roleKeywords, categories: prefs.categories })) {
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

      // Enqueue only — fetch/land workers run asynchronously. Never await the model.
      const hasAiKey = Boolean(llm.apiKey?.trim());
      const remainingDailyAiAttempts = hasAiKey
        ? await userJobAiBudgetRepository.remainingAttempts(
            userId,
            utcDay(),
            dailyAiAttemptCap(prefs.dailyBoardScoreCap)
          )
        : 0;
      const budget = computeLandBudget({
        poolSize: DISCOVERY_FETCH_POOL_SIZE,
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
      const enqueued = await requestJobDiscoveryLand({
        userId,
        runId,
        trigger: "find_now"
      });

      if (!enqueued) {
        return {
          enqueued: false,
          ingestTriggered: false,
          seats,
          reason: "queue_unavailable"
        };
      }

      return {
        enqueued: true,
        ingestTriggered: false,
        seats,
        runId: (await jobDiscoveryRunRepository.findActive(userId))?.runId ?? runId,
        reason: "ok"
      };
    }),

  searchCities: protectedProcedure
    .route({
      description: "City suggestions for the job settings geography autocomplete",
      method: "GET"
    })
    .input(z.object({ q: z.string().trim().min(1).max(60) }))
    .output(
      z.object({
        options: z.array(z.object({ value: z.string(), country: z.string() }))
      })
    )
    .handler(async ({ input }) => {
      return { options: await searchFreehireCities(input.q) };
    })
};
