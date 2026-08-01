import { emitAppNotification } from "@tsu-stack/api/lib/notification/emit-app-notification";
import { resolveRuntimeAiCredentials } from "@tsu-stack/api/lib/settings/resolve-runtime-ai";
import {
  canonicalizeJobUrl,
  defaultJobPreference,
  isValidHarvestedJob,
  scoreJobAgainstPreference,
  type HarvestedJob,
  type JobPreference,
  type MailJobHarvestResult
} from "@tsu-stack/core";
import {
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
 * 3. Score vs JobPreference; create Applications; notify
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

  const llm = await resolveRuntimeAiCredentials(row.userId, "classify");
  const agentResult = await callMailJobHarvestAgent({
    messageId: row.id,
    userId: row.userId,
    fromEmail: row.fromEmail ?? "",
    fromName: row.fromName ?? "",
    subject: row.subject ?? "",
    bodyText: row.bodyText ?? "",
    bodyHtml: row.bodyHtml,
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

  const jobs: HarvestedJob[] = output.jobs.filter((j) => isValidHarvestedJob(j));
  const prefs = await loadPreference(row.userId);

  let created = 0;
  let skippedLowMatch = 0;
  let skippedDuplicate = 0;
  let skippedFailed = 0;
  const applicationIds: string[] = [];

  for (const job of jobs) {
    try {
      const listingUrl = canonicalizeJobUrl(job.listingUrl) ?? job.listingUrl;
      const existing = await applicationRepository.findByUserIdAndUrl(row.userId, listingUrl);
      if (existing) {
        skippedDuplicate += 1;
        continue;
      }

      const match = scoreJobAgainstPreference({ ...job, listingUrl }, prefs);
      if (!match.passed) {
        skippedLowMatch += 1;
        continue;
      }

      const app = await applicationRepository.create({
        userId: row.userId,
        companyName: job.companyName,
        title: job.title,
        url: listingUrl,
        applyUrl: job.applyUrl ?? null,
        applyMethod: job.applyMethod ?? "unknown",
        matchScore: match.score,
        source: job.source ?? null,
        location: job.location ?? null,
        salaryRange: job.salaryRange ?? null,
        description: job.description ?? null,
        notes: `AI harvest from mail ${row.id}. ${match.reasons.join("; ") || "ok"}`,
        stage: "saved",
        hiringUrgency: "unknown",
        resumeId: null
      });

      if (app?.id) {
        created += 1;
        applicationIds.push(app.id);
        if (created === 1 && !row.applicationId) {
          await mailMessageRepository.setApplicationId(row.id, row.userId, app.id);
        }
      }
    } catch (err) {
      skippedFailed += 1;
      log.error(err instanceof Error ? err : new Error(String(err)), {
        event: "mail_job_harvest_job_create_failed",
        messageId: row.id,
        listingUrl: job.listingUrl
      });
      log.emit({ _forceKeep: true });
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
      href: "/dashboard/applications",
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
