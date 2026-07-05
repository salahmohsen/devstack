import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  CreateProjectInputSchema,
  DeleteResponseSchema,
  ProjectListOutputSchema,
  ProjectOutputSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  ToggleProjectArchivedResponseSchema,
  UpdateProjectInputSchema
} from "@tsu-stack/core/portfolio";
import { projectRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { toProjectOutput } from "#@/routers/portfolio.mappers";

export const portfolioProjectsRouter = {
  list: publicProcedure
    .route({
      description: "List all projects with their tech stacks",
      method: "GET"
    })
    .output(ProjectListOutputSchema)
    .handler(async () => {
      const projects = await projectRepository.findAll();
      return projects.map(toProjectOutput);
    }),
  get: publicProcedure
    .route({
      description: "Get a single project by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(ProjectOutputSchema.nullable())
    .handler(async ({ input }) => {
      const proj = await projectRepository.findById(input.id);
      return proj ? toProjectOutput(proj) : null;
    }),
  create: protectedProcedure
    .route({
      description: "Create a new project with optional tech stacks",
      method: "POST"
    })
    .input(CreateProjectInputSchema)
    .output(ProjectOutputSchema)
    .handler(async ({ input }) => {
      const { includedInPortfolio, ...createData } = input;
      const proj = await projectRepository.create(createData, { includedInPortfolio });
      return toProjectOutput(proj!);
    }),
  update: protectedProcedure
    .route({
      description: "Update a project and its stacks",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: UpdateProjectInputSchema }))
    .output(ProjectOutputSchema.nullable())
    .handler(async ({ input }) => {
      const { includedInPortfolio, ...updateData } = input.data;
      const proj = await projectRepository.update(input.id, updateData, { includedInPortfolio });
      return proj ? toProjectOutput(proj) : null;
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder projects by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input }) => {
      await projectRepository.reorder(input.items);
      return { success: true };
    }),
  toggleArchived: protectedProcedure
    .route({
      description: "Toggle the archived state of a project",
      method: "POST"
    })
    .input(z.object({ id: z.string() }))
    .output(ToggleProjectArchivedResponseSchema)
    .handler(async ({ input }) => {
      const proj = await projectRepository.toggleArchived(input.id);
      if (!proj) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }
      return toProjectOutput(proj);
    }),
  delete: protectedProcedure
    .route({
      description: "Delete a project and cascade its stacks",
      method: "DELETE"
    })
    .input(z.object({ id: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input }) => {
      const deleted = await projectRepository.delete(input.id);
      return { success: deleted !== null };
    })
};
