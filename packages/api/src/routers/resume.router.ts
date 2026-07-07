import {
  DeleteInputSchema,
  DeleteResponseSchema,
  ResumeListOutputSchema,
  ResumeOutputSchema,
  SetDefaultInputSchema
} from "@tsu-stack/core";
import { resumeRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

export const resumeRouter = {
  list: publicProcedure
    .route({
      description: "List all generated resumes",
      method: "GET"
    })
    .output(ResumeListOutputSchema)
    .handler(async () => resumeRepository.findAll()),
  get: publicProcedure
    .route({
      description: "Get a single resume by ID",
      method: "GET"
    })
    .input(SetDefaultInputSchema)
    .output(ResumeOutputSchema.optional())
    .handler(async ({ input }) => resumeRepository.findById(input.id)),
  getDefault: publicProcedure
    .route({
      description: "Get the default resume",
      method: "GET"
    })
    .output(ResumeOutputSchema.optional())
    .handler(async () => resumeRepository.findDefault()),
  setDefault: protectedProcedure
    .route({
      description: "Set a resume as the default (unsets any previous default)",
      method: "POST"
    })
    .input(SetDefaultInputSchema)
    .output(ResumeOutputSchema.optional())
    .handler(async ({ input }) => resumeRepository.setDefault(input.id)),
  delete: protectedProcedure
    .route({
      description: "Delete a resume (DB only — R2 cleanup handled upstream)",
      method: "DELETE"
    })
    .input(DeleteInputSchema)
    .output(DeleteResponseSchema)
    .handler(async ({ input }) => {
      const deleted = await resumeRepository.deleteMany(input.ids);
      return { success: deleted.length > 0 };
    })
};
