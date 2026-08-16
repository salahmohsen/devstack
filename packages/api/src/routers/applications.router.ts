import { z } from "zod";

import {
  AcceptApplyPackageInputSchema,
  AddApplicationNoteInputSchema,
  ApplicationActivityOutputSchema,
  ApplicationListOutputSchema,
  ApplicationOutputSchema,
  BatchDismissApplicationsInputSchema,
  BatchRestoreApplicationsInputSchema,
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  CountApplicationsInputSchema,
  CreateApplicationInputSchema,
  DeleteApplicationsInputSchema,
  DeleteResponseSchema,
  DismissApplicationInputSchema,
  GenerateApplyPackageInputSchema,
  ListApplicationActivityInputSchema,
  ListApplicationsInputSchema,
  PromoteApplicationInputSchema,
  RegenerateAgentTakeInputSchema,
  RefreshApplicationFromUrlInputSchema,
  RestoreApplicationInputSchema,
  ScanJobAlertsInputSchema,
  ScanJobAlertsOutputSchema,
  SendOutreachInputSchema,
  SetOutcomeInputSchema,
  UpdateApplicationInputSchema,
  UpdateStageInputSchema
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  jobPostingRepository,
  mailMessageRepository,
  resumeRepository
} from "@tsu-stack/db/repositories";

import { acceptApplyPackage } from "#@/lib/application/accept-apply-package";
import { generateAgentTake } from "#@/lib/application/generate-agent-take";
import { generateApplyPackage } from "#@/lib/application/generate-apply-package";
import { linkJobSkillsForUser } from "#@/lib/application/link-job-skills";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { refreshApplicationFromListingUrl } from "#@/lib/application/refresh-from-listing-url";
import { sendApplicationOutreach } from "#@/lib/application/send-application-outreach";
import { requestMailJobHarvest } from "#@/lib/mail/harvest-enqueue-hook";
import { protectedProcedure } from "#@/lib/procedures/factory";

type ApplicationRow = NonNullable<
  Awaited<ReturnType<typeof applicationRepository.findByIdForUser>>
>;

function toApplicationOutput(row: ApplicationRow, listingClosed = false) {
  return {
    id: row.id,
    companyName: row.companyName,
    title: row.title,
    url: row.url,
    applyUrl: row.applyUrl,
    applyMethod: row.applyMethod,
    matchScore: row.matchScore,
    source: row.source,
    sourceLabel: row.sourceLabel ?? null,
    sourceTags: row.sourceTags ?? [],
    location: row.location,
    workMode: row.workMode ?? null,
    hiringRegion: row.hiringRegion ?? null,
    requiredSkills: row.requiredSkills ?? [],
    preferredSkills: row.preferredSkills ?? [],
    salaryRange: row.salaryRange,
    employmentType: row.employmentType,
    description: row.description,
    notes: row.notes,
    agentTake: row.agentTake ?? null,
    sourceMessageId: row.sourceMessageId ?? null,
    trackingStatus: row.trackingStatus,
    stage: row.stage,
    stageChangedAt: row.stageChangedAt,
    outcome: row.outcome,
    outcomeAt: row.outcomeAt,
    hiringUrgency: row.hiringUrgency,
    resumeId: row.resumeId,
    recruiterEmail: row.recruiterEmail,
    coverLetterBody: row.coverLetterBody,
    coverLetterR2Key: row.coverLetterR2Key,
    coverLetterFilename: row.coverLetterFilename,
    outreachSubject: row.outreachSubject,
    outreachBody: row.outreachBody,
    outreachSentAt: row.outreachSentAt,
    outreachProviderMessageId: row.outreachProviderMessageId,
    applyPackageDraft: row.applyPackageDraft,
    applyPackageDraftedAt: row.applyPackageDraftedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    listingClosed
  };
}

/** Batch-resolve catalog closedAt for application.postingId (avoids N+1). */
async function listingClosedByPostingId(
  postingIds: Array<string | null | undefined>
): Promise<Map<string, boolean>> {
  const ids = [
    ...new Set(postingIds.filter((id): id is string => typeof id === "string" && id.length > 0))
  ];
  if (ids.length === 0) return new Map();
  const postings = await jobPostingRepository.findByIds(ids);
  return new Map(postings.map((p) => [p.id, p.closedAt != null]));
}

async function toApplicationOutputs(rows: ApplicationRow[]) {
  const closedById = await listingClosedByPostingId(rows.map((r) => r.postingId));
  return rows.map((row) =>
    toApplicationOutput(
      row,
      row.postingId != null ? (closedById.get(row.postingId) ?? false) : false
    )
  );
}

async function toApplicationOutputWithListing(row: ApplicationRow) {
  const [out] = await toApplicationOutputs([row]);
  return out;
}

function toActivityOutput(
  row: NonNullable<
    Awaited<ReturnType<typeof applicationActivityRepository.listByApplicationId>>
  >[number]
) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    kind: row.kind,
    body: row.body,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    actorUserId: row.actorUserId,
    createdAt: row.createdAt
  };
}

async function isResumeOwned(resumeId: string | null | undefined, userId: string) {
  if (resumeId == null) return true;
  const owned = await resumeRepository.findByIdForUser(resumeId, userId);
  return owned != null;
}

export const applicationsRouter = {
  list: protectedProcedure
    .route({
      description: "List job applications for the current user (optional trackingStatus filter)",
      method: "GET"
    })
    .input(ListApplicationsInputSchema.optional())
    .output(ApplicationListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const status = input?.trackingStatus ?? "tracked";
      const rows = await applicationRepository.findByUserIdAndTrackingStatus(userId, status);
      return toApplicationOutputs(rows);
    }),

  count: protectedProcedure
    .route({
      description: "Count applications for the current user by trackingStatus",
      method: "GET"
    })
    .input(CountApplicationsInputSchema)
    .output(z.object({ count: z.number().int().nonnegative() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const count = await applicationRepository.countByUserIdAndTrackingStatus(
        userId,
        input.trackingStatus
      );
      return { count };
    }),

  scanJobAlerts: protectedProcedure
    .route({
      description:
        "Enqueue harvest for recent job_notifier digests when importFromEmail is on. Dedupes by listing URL.",
      method: "POST"
    })
    .input(ScanJobAlertsInputSchema)
    .output(ScanJobAlertsOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const prefs = await loadJobPreference(userId);
      if (!prefs.importFromEmail) {
        context.logger.set({
          event: "scan_job_alerts_done",
          userId,
          importFromEmail: false,
          limit: input?.limit ?? 20,
          digestsFound: 0,
          enqueued: 0,
          enqueueFailed: 0,
          queueUnavailable: false
        });
        return { digestsFound: 0, enqueued: 0, queueUnavailable: false };
      }

      const limit = input?.limit ?? 20;
      // Must filter labels to job_notifier only (repo category map + belt-and-suspenders).
      const digests = (
        await mailMessageRepository.findByUserId({
          userId,
          category: "job_notifier",
          includeSystem: false,
          limit
        })
      ).filter((msg) => (msg.labels ?? []).includes("job_notifier"));

      let enqueued = 0;
      let enqueueFailed = 0;
      for (const msg of digests) {
        const ok = await requestMailJobHarvest({
          messageId: msg.id,
          userId,
          force: true
        });
        if (ok) enqueued += 1;
        else enqueueFailed += 1;
      }

      // force:true uses unique jobIds; enqueued===0 with digests almost always means hook/queue down.
      const queueUnavailable = digests.length > 0 && enqueued === 0;

      // Outcome log: Scan success toast only means enqueue — harvest is async.
      context.logger.set({
        event: "scan_job_alerts_done",
        userId,
        importFromEmail: true,
        limit,
        digestsFound: digests.length,
        enqueued,
        enqueueFailed,
        queueUnavailable,
        messageIds: digests.map((m) => m.id).slice(0, 25),
        subjects: digests.map((m) => (m.subject ?? "").slice(0, 80)).slice(0, 10)
      });

      return {
        digestsFound: digests.length,
        enqueued,
        queueUnavailable
      };
    }),

  get: protectedProcedure
    .route({
      description: "Get a single application by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(ApplicationOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await applicationRepository.findByIdForUser(input.id, userId);
      return row ? await toApplicationOutputWithListing(row) : null;
    }),

  create: protectedProcedure
    .route({
      description:
        "Create a tracked job application. With URL: create-if-absent; inbox/dismissed promote to tracked; already tracked returned as-is.",
      method: "POST"
    })
    .input(CreateApplicationInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Resume not found"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      if (!(await isResumeOwned(input.resumeId, userId))) {
        throw errors.NOT_FOUND();
      }
      const sourceTags =
        input.sourceTags ??
        buildApplicationSourceTags({ channel: "manual", platform: input.source ?? null });
      const trimmedUrl = input.url?.trim();
      const rawUrl = trimmedUrl && trimmedUrl.length > 0 ? trimmedUrl : null;
      const listingUrl = rawUrl ? (canonicalizeJobUrl(rawUrl) ?? rawUrl) : null;
      const linked = await linkJobSkillsForUser({
        userId,
        title: input.title,
        companyName: input.companyName,
        description: input.description ?? null,
        listingUrl
      });

      const common = {
        userId,
        companyName: input.companyName,
        title: input.title,
        applyUrl: input.applyUrl ?? null,
        applyMethod: input.applyMethod,
        matchScore: input.matchScore ?? null,
        source: input.source ?? null,
        sourceTags,
        location: input.location ?? null,
        salaryRange: input.salaryRange ?? null,
        employmentType: input.employmentType,
        workMode: input.workMode ?? null,
        requiredSkills: linked.requiredSkills,
        preferredSkills: linked.preferredSkills,
        description: input.description ?? null,
        notes: input.notes ?? null,
        trackingStatus: "tracked" as const,
        stage: input.stage,
        hiringUrgency: input.hiringUrgency,
        resumeId: input.resumeId ?? null
      };

      // URL present: race-safe dedup + conflict policy (hub parity).
      if (listingUrl) {
        const { row, created } = await applicationRepository.createIfAbsentByUrl({
          ...common,
          url: listingUrl
        });
        if (!created) {
          // Already tracked (open or closed): return as-is — no field overwrite, no reopen.
          if (row.trackingStatus === "tracked") {
            return toApplicationOutputWithListing(row);
          }
          // inbox / dismissed → promote to tracked
          const promoted = await applicationRepository.setTrackingStatus(row.id, userId, "tracked");
          if (!promoted) throw errors.NOT_FOUND();
          await applicationActivityRepository.append({
            userId,
            applicationId: promoted.id,
            kind: "promoted",
            actorUserId: userId,
            metadata: { from: row.trackingStatus, via: "manual_create_conflict" }
          });
          return toApplicationOutputWithListing(promoted);
        }
        await applicationActivityRepository.append({
          userId,
          applicationId: row.id,
          kind: "discovered",
          actorUserId: userId,
          metadata: { via: "manual_create", sourceTags }
        });
        return toApplicationOutputWithListing(row);
      }

      const created = await applicationRepository.create({
        ...common,
        url: null
      });
      await applicationActivityRepository.append({
        userId,
        applicationId: created.id,
        kind: "discovered",
        actorUserId: userId,
        metadata: { via: "manual_create", sourceTags }
      });
      return toApplicationOutputWithListing(created);
    }),

  promote: protectedProcedure
    .route({
      description: "Promote inbox/dismissed job to tracked",
      method: "POST"
    })
    .input(PromoteApplicationInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: { message: "Application not found" },
      INVALID_STATE: { message: "Application cannot be promoted from current status" }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const owned = await applicationRepository.findByIdForUser(input.id, userId);
      if (!owned) throw errors.NOT_FOUND();
      if (owned.trackingStatus === "tracked") {
        return toApplicationOutputWithListing(owned);
      }
      if (owned.trackingStatus !== "inbox" && owned.trackingStatus !== "dismissed") {
        throw errors.INVALID_STATE();
      }
      const from = owned.trackingStatus;
      const updated = await applicationRepository.setTrackingStatus(input.id, userId, "tracked");
      if (!updated) throw errors.NOT_FOUND();
      await applicationActivityRepository.append({
        userId,
        applicationId: input.id,
        kind: "promoted",
        actorUserId: userId,
        metadata: { from }
      });
      return toApplicationOutputWithListing(updated);
    }),

  dismiss: protectedProcedure
    .route({
      description: "Soft-dismiss an inbox job discovery",
      method: "POST"
    })
    .input(DismissApplicationInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: { message: "Application not found" },
      INVALID_STATE: { message: "Only inbox jobs can be dismissed" }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const owned = await applicationRepository.findByIdForUser(input.id, userId);
      if (!owned) throw errors.NOT_FOUND();
      if (owned.trackingStatus === "dismissed") {
        return toApplicationOutputWithListing(owned);
      }
      if (owned.trackingStatus !== "inbox") throw errors.INVALID_STATE();
      const updated = await applicationRepository.setTrackingStatus(input.id, userId, "dismissed");
      if (!updated) throw errors.NOT_FOUND();
      await applicationActivityRepository.append({
        userId,
        applicationId: input.id,
        kind: "dismissed",
        actorUserId: userId
      });
      return toApplicationOutputWithListing(updated);
    }),

  restore: protectedProcedure
    .route({
      description: "Restore a dismissed job back to New jobs inbox",
      method: "POST"
    })
    .input(RestoreApplicationInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: { message: "Application not found" },
      INVALID_STATE: { message: "Only dismissed jobs can be restored" }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const owned = await applicationRepository.findByIdForUser(input.id, userId);
      if (!owned) throw errors.NOT_FOUND();
      if (owned.trackingStatus === "inbox") {
        return toApplicationOutputWithListing(owned);
      }
      if (owned.trackingStatus !== "dismissed") throw errors.INVALID_STATE();
      const updated = await applicationRepository.setTrackingStatus(input.id, userId, "inbox");
      if (!updated) throw errors.NOT_FOUND();
      await applicationActivityRepository.append({
        userId,
        applicationId: input.id,
        kind: "restored",
        actorUserId: userId
      });
      return toApplicationOutputWithListing(updated);
    }),

  batchDismiss: protectedProcedure
    .route({
      description: "Soft-dismiss many inbox job discoveries in one request",
      method: "POST"
    })
    .input(BatchDismissApplicationsInputSchema)
    .output(ApplicationListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const rows = await applicationRepository.transitionTrackingStatusWithActivity({
        ids: input.ids,
        userId,
        fromStatus: "inbox",
        toStatus: "dismissed",
        activityKind: "dismissed",
        actorUserId: userId
      });
      return toApplicationOutputs(rows);
    }),

  batchRestore: protectedProcedure
    .route({
      description: "Restore many dismissed jobs to New jobs inbox in one request",
      method: "POST"
    })
    .input(BatchRestoreApplicationsInputSchema)
    .output(ApplicationListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const rows = await applicationRepository.transitionTrackingStatusWithActivity({
        ids: input.ids,
        userId,
        fromStatus: "dismissed",
        toStatus: "inbox",
        activityKind: "restored",
        actorUserId: userId
      });
      return toApplicationOutputs(rows);
    }),

  listActivity: protectedProcedure
    .route({
      description: "List activity timeline for an application",
      method: "GET"
    })
    .input(ListApplicationActivityInputSchema)
    .output(z.array(ApplicationActivityOutputSchema))
    .errors({
      NOT_FOUND: { message: "Application not found" }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const owned = await applicationRepository.findByIdForUser(input.applicationId, userId);
      if (!owned) throw errors.NOT_FOUND();
      const rows = await applicationActivityRepository.listByApplicationId(
        input.applicationId,
        userId,
        { limit: input.limit ?? 100, order: "asc" }
      );
      return rows.map(toActivityOutput);
    }),

  addNote: protectedProcedure
    .route({
      description: "Add a user note to an application timeline",
      method: "POST"
    })
    .input(AddApplicationNoteInputSchema)
    .output(ApplicationActivityOutputSchema)
    .errors({
      NOT_FOUND: { message: "Application not found" }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const owned = await applicationRepository.findByIdForUser(input.applicationId, userId);
      if (!owned) throw errors.NOT_FOUND();
      const row = await applicationActivityRepository.append({
        userId,
        applicationId: input.applicationId,
        kind: "note",
        body: input.body.trim(),
        actorUserId: userId
      });
      return toActivityOutput(row);
    }),

  update: protectedProcedure
    .route({
      description: "Update application body fields (not stage or outcome)",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: UpdateApplicationInputSchema }))
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      },
      RESUME_NOT_FOUND: {
        message: "Resume not found"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      if (
        input.data.resumeId !== undefined &&
        !(await isResumeOwned(input.data.resumeId, userId))
      ) {
        throw errors.RESUME_NOT_FOUND();
      }
      const updated = await applicationRepository.update(input.id, userId, input.data);
      if (!updated) throw errors.NOT_FOUND();
      return toApplicationOutputWithListing(updated);
    }),

  updateStage: protectedProcedure
    .route({
      description: "Move an open tracked application to a new pipeline stage",
      method: "POST"
    })
    .input(UpdateStageInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      },
      INVALID_STATE: {
        message: "Cannot change stage on a closed or non-tracked application"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const before = await applicationRepository.findByIdForUser(input.id, userId);
      const result = await applicationRepository.updateStage(input.id, userId, input.stage);
      if (!result.ok) {
        if (result.reason === "closed" || result.reason === "not_tracked") {
          throw errors.INVALID_STATE();
        }
        throw errors.NOT_FOUND();
      }
      await applicationActivityRepository.append({
        userId,
        applicationId: input.id,
        kind: "stage_changed",
        actorUserId: userId,
        metadata: { fromStage: before?.stage ?? null, toStage: input.stage }
      });
      return toApplicationOutputWithListing(result.row);
    }),

  setOutcome: protectedProcedure
    .route({
      description: "Close a tracked application with a terminal outcome (freezes stage)",
      method: "POST"
    })
    .input(SetOutcomeInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      },
      INVALID_STATE: {
        message: "Cannot set outcome on a non-tracked application"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const owned = await applicationRepository.findByIdForUser(input.id, userId);
      if (!owned) throw errors.NOT_FOUND();
      if (owned.trackingStatus !== "tracked") throw errors.INVALID_STATE();
      const updated = await applicationRepository.setOutcome(input.id, userId, input.outcome);
      if (!updated) throw errors.NOT_FOUND();
      await applicationActivityRepository.append({
        userId,
        applicationId: input.id,
        kind: "outcome_set",
        actorUserId: userId,
        metadata: { outcome: input.outcome, stage: owned.stage }
      });
      return toApplicationOutputWithListing(updated);
    }),

  delete: protectedProcedure
    .route({
      description: "Hard-delete one or more applications",
      method: "DELETE"
    })
    .input(DeleteApplicationsInputSchema)
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Load cover keys before deleteMany (returns only ids). Do not delete resume objects.
      const owned = (
        await Promise.all(input.ids.map((id) => applicationRepository.findByIdForUser(id, userId)))
      ).filter((row): row is NonNullable<typeof row> => row != null);

      const coverKeyById = new Map(
        owned
          .filter((row) => row.coverLetterR2Key)
          .map((row) => [row.id, row.coverLetterR2Key as string])
      );

      const deleted = await applicationRepository.deleteMany(input.ids, userId);

      await Promise.all(
        deleted.map(async ({ id }) => {
          const key = coverKeyById.get(id);
          if (!key) return;
          try {
            await context.mediaBucket.delete(key);
          } catch {
            // Best-effort cover cleanup; row is already gone.
          }
        })
      );

      return { success: deleted.length > 0 };
    }),

  regenerateAgentTake: protectedProcedure
    .route({
      description: "Generate or regenerate the AI agent take narrative for a job application",
      method: "POST"
    })
    .input(RegenerateAgentTakeInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: { message: "Application not found" },
      AI_NOT_CONFIGURED: {
        message: "Configure a BYO API key under Settings → AI"
      },
      INSUFFICIENT_LISTING: {
        message:
          "Need a fuller job description and listing details before the agent can write a take."
      },
      AGENT_FAILED: {
        message: "Agent take generation failed — check Settings → AI and try again"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await generateAgentTake({
        applicationId: input.id,
        userId
      });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        if (result.code === "AI_NOT_CONFIGURED") {
          throw errors.AI_NOT_CONFIGURED({ message: result.message });
        }
        if (result.code === "INSUFFICIENT_LISTING") {
          throw errors.INSUFFICIENT_LISTING({ message: result.message });
        }
        throw errors.AGENT_FAILED({ message: result.message });
      }
      return toApplicationOutputWithListing(result.application);
    }),

  refreshFromListingUrl: protectedProcedure
    .route({
      description:
        "Update posting URL and re-run page fetch + AI extract (fix broken harvest URLs on New jobs)",
      method: "POST"
    })
    .input(RefreshApplicationFromUrlInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: { message: "Application not found" },
      INVALID_URL: { message: "Enter a valid job posting URL" },
      URL_CONFLICT: { message: "Another job already uses this posting URL" },
      FETCH_FAILED: { message: "Could not fetch the listing page" },
      AI_NOT_CONFIGURED: {
        message: "Configure a BYO API key under Settings → AI"
      },
      AGENT_FAILED: {
        message: "Could not extract job details — check the URL and AI settings"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await refreshApplicationFromListingUrl({
        applicationId: input.id,
        userId,
        url: input.url
      });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        if (result.code === "INVALID_URL") {
          throw errors.INVALID_URL({ message: result.message });
        }
        if (result.code === "URL_CONFLICT") {
          throw errors.URL_CONFLICT({ message: result.message });
        }
        if (result.code === "FETCH_FAILED") {
          throw errors.FETCH_FAILED({ message: result.message });
        }
        if (result.code === "AI_NOT_CONFIGURED") {
          throw errors.AI_NOT_CONFIGURED({ message: result.message });
        }
        throw errors.AGENT_FAILED({ message: result.message });
      }
      return toApplicationOutputWithListing(result.application);
    }),

  generateApplyPackage: protectedProcedure
    .route({
      description:
        "Generate (or regenerate) an AI apply package draft for an application (resume selection, cover letter, outreach)",
      method: "POST"
    })
    .input(GenerateApplyPackageInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      },
      NO_EVIDENCE: {
        message: "No portfolio experiences or projects opted in for resume evidence"
      },
      AI_NOT_CONFIGURED: {
        message: "Configure a BYO API key under Settings → AI"
      },
      AGENT_FAILED: {
        message: "Apply package generation failed — check Settings → AI and try again"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await generateApplyPackage({
        applicationId: input.applicationId,
        userId
      });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        if (result.code === "NO_EVIDENCE") throw errors.NO_EVIDENCE({ message: result.message });
        if (result.code === "AI_NOT_CONFIGURED") {
          throw errors.AI_NOT_CONFIGURED({ message: result.message });
        }
        throw errors.AGENT_FAILED({ message: result.message });
      }
      await applicationActivityRepository.append({
        userId,
        applicationId: input.applicationId,
        kind: "package_generated",
        actorUserId: userId,
        metadata: { via: "generate_apply_package" }
      });
      return toApplicationOutputWithListing(result.application);
    }),

  acceptApplyPackage: protectedProcedure
    .route({
      description:
        "Accept an apply package draft: materialize tailored resume + cover PDFs and write accepted fields",
      method: "POST"
    })
    .input(AcceptApplyPackageInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      },
      NO_DRAFT: {
        message: "No apply package draft to accept — prepare a package first"
      },
      INVALID_DRAFT: {
        message: "Apply package draft is invalid — regenerate the package"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await acceptApplyPackage({
        applicationId: input.applicationId,
        userId,
        draft: input.draft,
        mediaBucket: context.mediaBucket
      });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        if (result.code === "NO_DRAFT") throw errors.NO_DRAFT({ message: result.message });
        throw errors.INVALID_DRAFT({ message: result.message });
      }
      return toApplicationOutputWithListing(result.application);
    }),

  sendOutreach: protectedProcedure
    .route({
      description:
        "Send outreach email with resume PDF attachment; stamps send metadata and advances saved→applied",
      method: "POST"
    })
    .input(SendOutreachInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      },
      CLOSED: {
        message: "Cannot send outreach for a closed application"
      },
      NO_RESUME: {
        message: "Link a resume before sending outreach"
      },
      NO_RECIPIENT: {
        message: "Set a valid recruiter email before sending outreach"
      },
      MAIL_NOT_CONFIGURED: {
        message: "Configure Resend under Settings → Integrations before sending"
      },
      SEND_FAILED: {
        message: "Failed to send outreach email"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await sendApplicationOutreach({
        applicationId: input.applicationId,
        userId,
        mediaBucket: context.mediaBucket
      });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        if (result.code === "CLOSED") throw errors.CLOSED({ message: result.message });
        if (result.code === "NO_RESUME") throw errors.NO_RESUME({ message: result.message });
        if (result.code === "NO_RECIPIENT") throw errors.NO_RECIPIENT({ message: result.message });
        if (result.code === "MAIL_NOT_CONFIGURED") {
          throw errors.MAIL_NOT_CONFIGURED({ message: result.message });
        }
        throw errors.SEND_FAILED({ message: result.message });
      }
      return toApplicationOutputWithListing(result.application);
    })
};
