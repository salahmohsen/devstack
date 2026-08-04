import { z } from "zod";

import {
  AcceptApplyPackageInputSchema,
  ApplicationListOutputSchema,
  ApplicationOutputSchema,
  CreateApplicationInputSchema,
  DeleteApplicationsInputSchema,
  DeleteResponseSchema,
  GenerateApplyPackageInputSchema,
  SendOutreachInputSchema,
  SetOutcomeInputSchema,
  UpdateApplicationInputSchema,
  UpdateStageInputSchema
} from "@tsu-stack/core";
import { applicationRepository, resumeRepository } from "@tsu-stack/db/repositories";

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
    location: row.location,
    salaryRange: row.salaryRange,
    description: row.description,
    notes: row.notes,
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

async function isResumeOwned(resumeId: string | null | undefined, userId: string) {
  if (resumeId == null) return true;
  const owned = await resumeRepository.findByIdForUser(resumeId, userId);
  return owned != null;
}

export const applicationsRouter = {
  list: protectedProcedure
    .route({
      description: "List all job applications for the current user",
      method: "GET"
    })
    .output(ApplicationListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const rows = await applicationRepository.findAllByUserId(userId);
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
      description: "Create a job application",
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
      const created = await applicationRepository.create({
        userId,
        companyName: input.companyName,
        title: input.title,
        url: input.url ?? null,
        applyUrl: input.applyUrl ?? null,
        applyMethod: input.applyMethod,
        matchScore: input.matchScore ?? null,
        source: input.source ?? null,
        location: input.location ?? null,
        salaryRange: input.salaryRange ?? null,
        description: input.description ?? null,
        notes: input.notes ?? null,
        stage: input.stage,
        hiringUrgency: input.hiringUrgency,
        resumeId: input.resumeId ?? null
      });
      return toApplicationOutput(created);
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
      description: "Move an open application to a new pipeline stage",
      method: "POST"
    })
    .input(UpdateStageInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      },
      INVALID_STATE: {
        message: "Cannot change stage on a closed application"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await applicationRepository.updateStage(input.id, userId, input.stage);
      if (!result.ok) {
        if (result.reason === "closed") throw errors.INVALID_STATE();
        throw errors.NOT_FOUND();
      }
      return toApplicationOutput(result.row);
    }),

  setOutcome: protectedProcedure
    .route({
      description: "Close an application with a terminal outcome (freezes stage)",
      method: "POST"
    })
    .input(SetOutcomeInputSchema)
    .output(ApplicationOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Application not found"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const updated = await applicationRepository.setOutcome(input.id, userId, input.outcome);
      if (!updated) throw errors.NOT_FOUND();
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
