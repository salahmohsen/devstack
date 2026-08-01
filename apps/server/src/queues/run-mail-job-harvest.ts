import { emitAppNotification } from "@tsu-stack/api/lib/notification/emit-app-notification";
import {
  canonicalizeJobUrl,
  defaultJobPreference,
  enrichJobFromHtml,
  harvestJobsFromMailBody,
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

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FETCH_PER_MESSAGE = 8;

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

async function tryEnrichFromNetwork(job: HarvestedJob): Promise<HarvestedJob> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(job.listingUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CareerInboxHarvest/1.0 (+local; job alert enrich)",
        Accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });
    clearTimeout(t);
    if (!res.ok) return job;
    const html = await res.text();
    if (html.length < 200) return job;
    return enrichJobFromHtml(job, html.slice(0, 200_000));
  } catch {
    return job;
  }
}

/**
 * Harvest job listings from a classified `job_notifier` mail:
 * 1. Extract job cards/URLs from body (primary — LinkedIn digests)
 * 2. Optionally enrich via HTTP fetch (apply method / external apply URL)
 * 3. Score vs JobPreference; hard-skip below minMatchScore
 * 4. Create Applications (dedupe by listing url)
 * 5. Batch notify mail.job_alerts_ready when any created
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

  let jobs = harvestJobsFromMailBody({
    bodyText: row.bodyText ?? "",
    bodyHtml: row.bodyHtml,
    subject: row.subject ?? "",
    fromEmail: row.fromEmail ?? ""
  });

  jobs = await Promise.all(
    jobs.map(async (j, i) => {
      if (i >= MAX_FETCH_PER_MESSAGE) return j;
      return tryEnrichFromNetwork(j);
    })
  );

  const prefs = await loadPreference(row.userId);
  let created = 0;
  let skippedLowMatch = 0;
  let skippedDuplicate = 0;
  let skippedFailed = 0;
  const applicationIds: string[] = [];

  for (const job of jobs) {
    try {
      if (!isValidHarvestedJob(job)) {
        skippedFailed += 1;
        continue;
      }
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
        notes: `Harvested from mail ${row.id}. Match: ${match.reasons.join("; ") || "ok"}`,
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
          ? `From a job alert · skipped ${skippedLowMatch} low match`
          : "From a job alert email",
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
    ...result
  });
  log.emit();

  return result;
}
