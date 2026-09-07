import { z } from "zod";

import {
  CreateEducationInputSchema,
  DeleteResponseSchema,
  EducationListOutputSchema,
  EducationOutputSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  UpdateEducationInputSchema
} from "@tsu-stack/core";
import { educationRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { schedulePortfolioDefaultResumeSync } from "#@/lib/resume/sync-portfolio-default-resume";
import { toEducationOutput } from "#@/routers/education.mappers";

export const educationsRouter = {
  /**
   * Full catalog for the resume-form education section and sort normalize.
   */
  list: protectedProcedure
    .route({
      description: "List all education entries for the current user",
      method: "GET"
    })
    .output(EducationListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const education = await educationRepository.findAllByUserId(userId);
      return education.map(toEducationOutput);
    }),

  get: protectedProcedure
    .route({
      description: "Get a single education entry by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(EducationOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await educationRepository.findByIdForUser(input.id, userId);
      return row ? toEducationOutput(row) : null;
    }),
  create: protectedProcedure
    .route({
      description: "Create a new education entry",
      method: "POST"
    })
    .input(CreateEducationInputSchema)
    .output(EducationOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await educationRepository.create({ ...input, userId });
      schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      return toEducationOutput(row!);
    }),
  update: protectedProcedure
    .route({
      description: "Update an education entry",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: UpdateEducationInputSchema }))
    .output(EducationOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await educationRepository.update(input.id, userId, input.data);
      if (row) {
        schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      }
      return row ? toEducationOutput(row) : null;
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder education entries by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      await educationRepository.reorder(userId, input.items);
      return { success: true };
    }),
  delete: protectedProcedure
    .route({
      description: "Delete an education entry",
      method: "DELETE"
    })
    .input(z.object({ id: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const deleted = await educationRepository.delete(input.id, userId);
      if (deleted !== null) {
        schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      }
      return { success: deleted !== null };
    })
};
