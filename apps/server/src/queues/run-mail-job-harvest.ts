import { emitAppNotification } from "@tsu-stack/api/lib/notification/emit-app-notification";
import { resolveRuntimeAiCredentials } from "@tsu-stack/api/lib/settings/resolve-runtime-ai";
import {
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  defaultJobPreference,
  inferApplicationSource,
  isValidHarvestedJob,
  type JobPreference,
  type MailJobHarvestResult,
  type ScoredHarvestedJob
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  jobPreferenceRepository,
  mailMessageRepository
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { callMailJobHarvestAgent } from "#@/queues/call-mail-job-harvest-agent";

async function loadPreference(userId: string): Promise<JobPreference> {
  const row = await jobPreferenceRepository.findByUserId(userId);
  if (!row) return defaultJobPreference();
  return {
    workModes: row.workModes ?? [],
    locations: row.locations ?? [],
    roleKeywords: row.roleKeywords ?? [],
    excludeKeywords: row.excludeKeywords ?? [],
    salaryMin: row.salaryMin,
    salaryCurrency: row.salaryCurrency,
    minMatchScore: row.minMatchScore ?? 60
  };
}

/**
 * Harvest job listings from a classified `job_notifier` mail via Mastra AI:
 * 1. Workflow: AI reads mail → extract job cards/URLs
 * 2. Workflow: fetch each listing URL (tool) → AI structured job fields
 * 3. Workflow: AI scores each job against JobPreference (semantic)
 * 4. Workflow: AI agent take for matchPassed jobs (soft-fail)
 * 5. Create Applications for matchPassed jobs (inbox)
 */
export async function runMailJobHarvest(input: {
  messageId: string;
  userId: string;
}): Promise<MailJobHarvestResult> {
  const log = createLogger({ operation: "server__mail_job_harvest_run" });
  const empty = (extra: Partial<MailJobHarvestResult> = {}): MailJobHarvestResult => {
    return {
      messageId: input.messageId,
      userId: input.userId,
      candidatesFound: 0,
      created: 0,
      skippedLowMatch: 0,
      skippedDuplicate: 0,
      skippedFailed: 0,
      applicationIds: [],
      ...extra
    };
  };

  const row = await mailMessageRepository.findByIdForUser(input.messageId, input.userId, {
    includeSystem: true
  });
  if (!row) {
    log.set({
      event: "mail_job_harvest_message_missing",
      messageId: input.messageId,
      userId: input.userId
    });
    log.emit();
    return empty({ skippedFailed: 1 });
  }

  const labels = row.labels ?? [];
  if (!labels.includes("job_notifier")) {
    log.set({
      event: "mail_job_harvest_skip_not_notifier",
      messageId: row.id,
      userId: row.userId,
      labels
    });
    log.emit();
    return empty();
  }

  const prefs = await loadPreference(row.userId);
  const llm = await resolveRuntimeAiCredentials(row.userId, "classify");
  const agentResult = await callMailJobHarvestAgent({
    messageId: row.id,
    userId: row.userId,
    fromEmail: row.fromEmail ?? "",
    fromName: row.fromName ?? "",
    subject: row.subject ?? "",
    bodyText: row.bodyText ?? "",
    bodyHtml: row.bodyHtml,
    preference: prefs,
    llm
  });

  if (!agentResult.ok) {
    log.set({
      event: "mail_job_harvest_ai_failed",
      messageId: row.id,
      userId: row.userId,
      reason: agentResult.failure.reason,
      message: agentResult.failure.message ?? null
    });
    log.emit({ _forceKeep: true });
    return empty({
      skippedFailed: 1
    });
  }

  const { output } = agentResult.data;
  if (!output.isJobNotifier) {
    log.set({
      event: "mail_job_harvest_ai_not_notifier",
      messageId: row.id,
      notes: output.notes ?? null
    });
    log.emit();
    return empty();
  }

  // AI already extracted + scored; only structural http(s)/title gate remains local
  const jobs: ScoredHarvestedJob[] = output.jobs.filter((j) => isValidHarvestedJob(j));

  let created = 0;
  let skippedLowMatch = 0;
  let skippedDuplicate = 0;
  let skippedFailed = 0;
  const applicationIds: string[] = [];

  for (const job of jobs) {
    try {
      // Strip tracking query params only — AI chooses multi-source listing URL
      const listingUrl = canonicalizeJobUrl(job.listingUrl) ?? job.listingUrl;

      if (!job.matchPassed) {
        skippedLowMatch += 1;
        continue;
      }

      const platform = job.source ?? inferApplicationSource(listingUrl, row.fromEmail ?? undefined);
      const sourceTags = buildApplicationSourceTags({ channel: "mail", platform });

      // Race-safe: unique (userId, url) + onConflictDoNothing
      const { row: app, created: wasCreated } = await applicationRepository.createIfAbsentByUrl({
        userId: row.userId,
        companyName: job.companyName,
        title: job.title,
        url: listingUrl,
        applyUrl: job.applyUrl ?? null,
        applyMethod: job.applyMethod ?? "unknown",
        matchScore: job.matchScore,
        source: platform,
        sourceTags,
        location: job.location ?? null,
        salaryRange: job.salaryRange ?? null,
        description: job.description ?? null,
        notes: null,
        agentTake: job.agentTake?.trim() ? job.agentTake.trim().slice(0, 1200) : null,
        sourceMessageId: row.id,
        trackingStatus: "inbox",
        stage: "saved",
        hiringUrgency: "unknown",
        resumeId: null
      });

      if (!wasCreated) {
        skippedDuplicate += 1;
        continue;
      }

      created += 1;
      applicationIds.push(app.id);
      await applicationActivityRepository.append({
        userId: row.userId,
        applicationId: app.id,
        kind: "discovered",
        metadata: {
          matchScore: job.matchScore,
          matchReasons: job.matchReasons ?? [],
          messageId: row.id,
          sourceTags
        }
      });
      if (created === 1 && !row.applicationId) {
        await mailMessageRepository.setApplicationId(row.id, row.userId, app.id);
      }
    } catch (err) {
      skippedFailed += 1;
      // One logger lifetime for the whole run — only set mid-loop; emit once at end.
      log.error(err instanceof Error ? err : new Error(String(err)), {
        event: "mail_job_harvest_job_create_failed",
        messageId: row.id,
        listingUrl: job.listingUrl
      });
    }
  }

  if (created > 0) {
    await emitAppNotification({
      userId: row.userId,
      kind: "mail.job_alerts_ready",
      title:
        created === 1
          ? "1 job matched your preferences"
          : `${created} jobs matched your preferences`,
      body:
        skippedLowMatch > 0
          ? `AI harvest · skipped ${skippedLowMatch} low match`
          : "AI harvest from job alert email",
      href: "/dashboard/new-jobs",
      messageId: row.id,
      applicationId: applicationIds[0] ?? null
    });
  }

  const result: MailJobHarvestResult = {
    messageId: row.id,
    userId: row.userId,
    candidatesFound: jobs.length,
    created,
    skippedLowMatch,
    skippedDuplicate,
    skippedFailed,
    applicationIds
  };

  log.set({
    event: "mail_job_harvest_done",
    via: "mastra_ai",
    notes: output.notes ?? null,
    ...result
  });
  log.emit();

  return result;
}
