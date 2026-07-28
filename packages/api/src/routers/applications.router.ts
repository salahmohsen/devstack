import { z } from "zod";

import {
  ApplicationListOutputSchema,
  ApplicationOutputSchema,
  CreateApplicationInputSchema,
  DeleteApplicationsInputSchema,
  DeleteResponseSchema,
  SetOutcomeInputSchema,
  UpdateApplicationInputSchema,
  UpdateStageInputSchema
} from "@tsu-stack/core";
import { applicationRepository, resumeRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";

function toApplicationOutput(
  row: NonNullable<Awaited<ReturnType<typeof applicationRepository.findByIdForUser>>>
) {
  return {
    id: row.id,
    companyName: row.companyName,
    title: row.title,
    url: row.url,
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
    .output(ApplicationOutputSchema.nullable())
    .errors({
      NOT_FOUND: {
        message: "Resume not found"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      if (
        input.data.resumeId !== undefined &&
        !(await isResumeOwned(input.data.resumeId, userId))
      ) {
        throw errors.NOT_FOUND();
      }
      const updated = await applicationRepository.update(input.id, userId, input.data);
      return updated ? toApplicationOutput(updated) : null;
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
      const deleted = await applicationRepository.deleteMany(input.ids, userId);
      return { success: deleted.length > 0 };
    })
};
