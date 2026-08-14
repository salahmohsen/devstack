import { loadJobPreference } from "@tsu-stack/api/lib/application/load-job-preference";
import { loadSeekerMatchEvidence } from "@tsu-stack/api/lib/application/load-seeker-match-evidence";
import { emitAppNotification } from "@tsu-stack/api/lib/notification/emit-app-notification";
import { resolveRuntimeAiCredentials } from "@tsu-stack/api/lib/settings/resolve-runtime-ai";
import {
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  isValidHarvestedJob,
  resolveApplicationSourceFields,
  type HarvestJobPreference,
  type MailJobHarvestResult,
  type ScoredHarvestedJob
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  mailMessageRepository
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { callMailJobHarvestAgent } from "#@/queues/call-mail-job-harvest-agent";

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
    log.emit({ _forceKeep: true });
    return empty({ skippedFailed: 1 });
  }

  const labels = row.labels ?? [];
  if (!labels.includes("job_notifier")) {
    // Scan used to enqueue any recent mail when category filter was broken —
    // keep this outcome force-kept so Axiom shows mis-enqueued ids clearly.
    log.set({
      event: "mail_job_harvest_skip_not_notifier",
      messageId: row.id,
      userId: row.userId,
      labels,
      subject: (row.subject ?? "").slice(0, 120)
    });
    log.emit({ _forceKeep: true });
    return empty();
  }

  const [prefs, evidence] = await Promise.all([
    loadJobPreference(row.userId),
    loadSeekerMatchEvidence(row.userId)
  ]);
  const harvestPreference: HarvestJobPreference = { ...prefs, evidence };
  const llm = await resolveRuntimeAiCredentials(row.userId, "classify");
  // Shared diagnostic fields — emitted once on terminal outcome.
  const harvestContext = {
    messageId: row.id,
    userId: row.userId,
    subject: (row.subject ?? "").slice(0, 120),
    labels: row.labels ?? [],
    minMatchScore: prefs.minMatchScore,
    roleKeywordCount: prefs.roleKeywords?.length ?? 0,
    excludeKeywordCount: prefs.excludeKeywords?.length ?? 0,
    evidenceRoleTitles: evidence.roleTitles.length,
    evidenceStacks: evidence.stackNames.length,
    hasByoApiKey: Boolean(llm.apiKey?.trim()),
    modelId: llm.modelId ?? null
  };

  const agentResult = await callMailJobHarvestAgent({
    messageId: row.id,
    userId: row.userId,
    fromEmail: row.fromEmail ?? "",
    fromName: row.fromName ?? "",
    subject: row.subject ?? "",
    bodyText: row.bodyText ?? "",
    bodyHtml: row.bodyHtml,
    preference: harvestPreference,
    llm
  });

  if (!agentResult.ok) {
    log.set({
      event: "mail_job_harvest_ai_failed",
      ...harvestContext,
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
      ...harvestContext,
      notes: output.notes ?? null
    });
    log.emit({ _forceKeep: true });
    return empty();
  }

  // AI already extracted + scored; only structural http(s)/title gate remains local
  const jobs: ScoredHarvestedJob[] = output.jobs.filter((j) => isValidHarvestedJob(j));
  const scoreSample = jobs.slice(0, 12).map((j) => {
    return {
      title: j.title.slice(0, 80),
      score: j.matchScore,
      passed: j.matchPassed,
      reasons: (j.matchReasons ?? []).slice(0, 3)
    };
  });

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

      const { source: platform, sourceLabel } = resolveApplicationSourceFields({
        listingUrl,
        fromEmail: row.fromEmail,
        modelSource: job.source,
        modelSourceLabel: job.sourceLabel ?? null
      });
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
        sourceLabel,
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
  } else if (jobs.length > 0 && skippedLowMatch > 0) {
    // Success toast after Scan only means enqueue — surface why New jobs stayed empty.
    await emitAppNotification({
      userId: row.userId,
      kind: "mail.job_alerts_ready",
      title:
        skippedLowMatch === 1
          ? "1 listing below your match threshold"
          : `${skippedLowMatch} listings below your match threshold`,
      body: `Min score ${prefs.minMatchScore}. Lower it in Settings → Jobs, or broaden role keywords. Duplicates skipped: ${skippedDuplicate}.`,
      href: "/dashboard/settings/jobs",
      messageId: row.id,
      applicationId: null
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
    scoreSample,
    ...harvestContext,
    ...result
  });
  log.emit({ _forceKeep: true });

  return result;
}
