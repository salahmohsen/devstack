import { z } from "zod";

import {
  CreateExperienceInputSchema,
  DeleteResponseSchema,
  ExperienceListOutputSchema,
  ExperienceOutputSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  UpdateExperienceInputSchema
} from "@tsu-stack/core/portfolio";
import { experienceRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { toExperienceOutput } from "#@/routers/portfolio.mappers";

export const portfolioExperiencesRouter = {
  list: publicProcedure
    .route({
      description: "List all experiences with their projects",
      method: "GET"
    })
    .output(ExperienceListOutputSchema)
    .handler(async () => {
      const experiences = await experienceRepository.findAll();
      return experiences.map(toExperienceOutput);
    }),
  get: publicProcedure
    .route({
      description: "Get a single experience by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(ExperienceOutputSchema.nullable())
    .handler(async ({ input }) => {
      const exp = await experienceRepository.findById(input.id);
      return exp ? toExperienceOutput(exp) : null;
    }),
  create: protectedProcedure
    .route({
      description: "Create a new experience entry",
      method: "POST"
    })
    .input(CreateExperienceInputSchema)
    .output(ExperienceOutputSchema)
    .handler(async ({ input }) => {
      const { includedInPortfolio, ...createData } = input;
      const exp = await experienceRepository.create(createData, { includedInPortfolio });
      return toExperienceOutput(exp!);
    }),
  update: protectedProcedure
    .route({
      description: "Update an experience entry",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: UpdateExperienceInputSchema }))
    .output(ExperienceOutputSchema.nullable())
    .handler(async ({ input }) => {
      const { includedInPortfolio, ...updateData } = input.data;
      const exp = await experienceRepository.update(input.id, updateData, { includedInPortfolio });
      return exp ? toExperienceOutput(exp) : null;
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder experiences by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input }) => {
      await experienceRepository.reorder(input.items);
      return { success: true };
    }),
  delete: protectedProcedure
    .route({
      description: "Delete an experience entry and cascade its projects",
      method: "DELETE"
    })
    .input(z.object({ id: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input }) => {
      const deleted = await experienceRepository.delete(input.id);
      return { success: deleted !== null };
    })
};
