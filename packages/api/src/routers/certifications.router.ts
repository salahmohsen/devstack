import { z } from "zod";

import {
  CertificationListOutputSchema,
  CertificationOutputSchema,
  CreateCertificationInputSchema,
  DeleteResponseSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  UpdateCertificationInputSchema
} from "@tsu-stack/core";
import { certificationRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { schedulePortfolioDefaultResumeSync } from "#@/lib/resume/sync-portfolio-default-resume";
import { toCertificationOutput } from "#@/routers/certification.mappers";

export const certificationsRouter = {
  /**
   * Full catalog for the resume-form certification section and sort normalize.
   */
  list: protectedProcedure
    .route({
      description: "List all certification entries for the current user",
      method: "GET"
    })
    .output(CertificationListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const certifications = await certificationRepository.findAllByUserId(userId);
      return certifications.map(toCertificationOutput);
    }),

  get: protectedProcedure
    .route({
      description: "Get a single certification entry by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(CertificationOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await certificationRepository.findByIdForUser(input.id, userId);
      return row ? toCertificationOutput(row) : null;
    }),
  create: protectedProcedure
    .route({
      description: "Create a new certification entry",
      method: "POST"
    })
    .input(CreateCertificationInputSchema)
    .output(CertificationOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await certificationRepository.create({ ...input, userId });
      schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      return toCertificationOutput(row!);
    }),
  update: protectedProcedure
    .route({
      description: "Update a certification entry",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: UpdateCertificationInputSchema }))
    .output(CertificationOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await certificationRepository.update(input.id, userId, input.data);
      if (row) {
        schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      }
      return row ? toCertificationOutput(row) : null;
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder certification entries by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      await certificationRepository.reorder(userId, input.items);
      return { success: true };
    }),
  delete: protectedProcedure
    .route({
      description: "Delete a certification entry",
      method: "DELETE"
    })
    .input(z.object({ id: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const deleted = await certificationRepository.delete(input.id, userId);
      if (deleted !== null) {
        schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      }
      return { success: deleted !== null };
    })
};
