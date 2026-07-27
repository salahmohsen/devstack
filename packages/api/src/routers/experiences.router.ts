import { z } from "zod";

import {
  CreateExperienceInputSchema,
  DeleteResponseSchema,
  ExperienceListOutputSchema,
  ExperienceOutputSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  UpdateExperienceInputSchema
} from "@tsu-stack/core";
import { experienceRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { toExperienceOutput } from "#@/routers/portfolio.mappers";

export const experiencesRouter = {
  list: protectedProcedure
    .route({
      description: "List all experiences with their projects",
      method: "GET"
    })
    .output(ExperienceListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const experiences = await experienceRepository.findAllByUserId(userId);
      return experiences.map(toExperienceOutput);
    }),
  get: protectedProcedure
    .route({
      description: "Get a single experience by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(ExperienceOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const exp = await experienceRepository.findByIdForUser(input.id, userId);
      return exp ? toExperienceOutput(exp) : null;
    }),
  create: protectedProcedure
    .route({
      description: "Create a new experience entry",
      method: "POST"
    })
    .input(CreateExperienceInputSchema)
    .output(ExperienceOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { includedInPortfolio, ...createData } = input;
      const exp = await experienceRepository.create(
        { ...createData, userId },
        { includedInPortfolio }
      );
      return toExperienceOutput(exp!);
    }),
  update: protectedProcedure
    .route({
      description: "Update an experience entry",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: UpdateExperienceInputSchema }))
    .output(ExperienceOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { includedInPortfolio, ...updateData } = input.data;
      const exp = await experienceRepository.update(input.id, userId, updateData, {
        includedInPortfolio
      });
      return exp ? toExperienceOutput(exp) : null;
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder experiences by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      await experienceRepository.reorder(userId, input.items);
      return { success: true };
    }),
  delete: protectedProcedure
    .route({
      description: "Delete an experience entry and cascade its projects",
      method: "DELETE"
    })
    .input(z.object({ id: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const deleted = await experienceRepository.delete(input.id, userId);
      return { success: deleted !== null };
    })
};
