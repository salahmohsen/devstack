import { z } from "zod";

import {
  AcceptApplyPackageInputSchema,
  AddApplicationNoteInputSchema,
  ApplicationActivityOutputSchema,
  ApplicationListOutputSchema,
  ApplicationOutputSchema,
  buildApplicationSourceTags,
  CreateApplicationInputSchema,
  DeleteApplicationsInputSchema,
  DeleteResponseSchema,
  DismissApplicationInputSchema,
  GenerateApplyPackageInputSchema,
  ListApplicationActivityInputSchema,
  ListApplicationsInputSchema,
  PromoteApplicationInputSchema,
  RestoreApplicationInputSchema,
  SendOutreachInputSchema,
  SetOutcomeInputSchema,
  UpdateApplicationInputSchema,
  UpdateStageInputSchema
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  resumeRepository
} from "@tsu-stack/db/repositories";

import { acceptApplyPackage } from "#@/lib/application/accept-apply-package";
import { generateApplyPackage } from "#@/lib/application/generate-apply-package";
import { sendApplicationOutreach } from "#@/lib/application/send-application-outreach";
import { protectedProcedure } from "#@/lib/procedures/factory";

function toApplicationOutput(
  row: NonNullable<Awaited<ReturnType<typeof applicationRepository.findByIdForUser>>>
) {
  return {
    id: row.id,
    companyName: row.companyName,
    title: row.title,
    url: row.url,
    applyUrl: row.applyUrl,
    applyMethod: row.applyMethod,
    matchScore: row.matchScore,
    source: row.source,
    sourceTags: row.sourceTags ?? [],
    location: row.location,
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
    updatedAt: row.updatedAt
  };
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
      return rows.map(toApplicationOutput);
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
      return row ? toApplicationOutput(row) : null;
    }),

  create: protectedProcedure
    .route({
      description: "Create a tracked job application",
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
      const created = await applicationRepository.create({
        userId,
        companyName: input.companyName,
        title: input.title,
        url: input.url ?? null,
        applyUrl: input.applyUrl ?? null,
        applyMethod: input.applyMethod,
        matchScore: input.matchScore ?? null,
        source: input.source ?? null,
        sourceTags,
        location: input.location ?? null,
        salaryRange: input.salaryRange ?? null,
        employmentType: input.employmentType,
        description: input.description ?? null,
        notes: input.notes ?? null,
        trackingStatus: "tracked",
        stage: input.stage,
        hiringUrgency: input.hiringUrgency,
        resumeId: input.resumeId ?? null
      });
      await applicationActivityRepository.append({
        userId,
        applicationId: created.id,
        kind: "discovered",
        actorUserId: userId,
        metadata: { via: "manual_create", sourceTags }
      });
      return toApplicationOutput(created);
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
        return toApplicationOutput(owned);
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
      return toApplicationOutput(updated);
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
        return toApplicationOutput(owned);
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
      return toApplicationOutput(updated);
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
        return toApplicationOutput(owned);
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
      return toApplicationOutput(updated);
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
      return toApplicationOutput(updated);
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
      return toApplicationOutput(result.row);
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
      return toApplicationOutput(updated);
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
      return toApplicationOutput(result.application);
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
      return toApplicationOutput(result.application);
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
        message: "Configure Resend under Settings → Mail before sending"
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
      return toApplicationOutput(result.application);
    })
};
