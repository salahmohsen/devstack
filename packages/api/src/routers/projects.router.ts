import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  CreateProjectInputSchema,
  DeleteResponseSchema,
  PROJECTS_LIST_PAGE_SIZE,
  ProjectListOutputSchema,
  ProjectListPageInputSchema,
  ProjectListPageOutputSchema,
  ProjectOutputSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  ToggleProjectArchivedResponseSchema,
  UpdateProjectInputSchema
} from "@tsu-stack/core";
import { projectRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { toProjectOutput } from "#@/routers/portfolio.mappers";

export const projectsRouter = {
  /**
   * Full catalog for pickers (stack form, experience link) and sort normalize.
   * Dashboard list uses `listPage` + infinite scroll instead.
   */
  list: protectedProcedure
    .route({
      description:
        "List all projects with their tech stacks (full catalog for pickers; grid uses listPage)",
      method: "GET"
    })
    .output(ProjectListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const projects = await projectRepository.findAllByUserId(userId);
      return projects.map(toProjectOutput);
    }),

  /** Cursor page for dashboard infinite scroll. */
  listPage: protectedProcedure
    .route({
      description: "Paginated projects for dashboard infinite scroll (includes stacks)",
      method: "GET"
    })
    .input(ProjectListPageInputSchema.optional())
    .output(ProjectListPageOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const limit = input?.limit ?? PROJECTS_LIST_PAGE_SIZE;
      const page = await projectRepository.findPageByUserId(userId, {
        cursor: input?.cursor ?? null,
        limit
      });

      return {
        items: page.items.map(toProjectOutput),
        nextCursor: page.nextCursor,
        totalCount: page.totalCount
      };
    }),

  get: protectedProcedure
    .route({
      description: "Get a single project by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(ProjectOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const proj = await projectRepository.findByIdForUser(input.id, userId);
      return proj ? toProjectOutput(proj) : null;
    }),
  create: protectedProcedure
    .route({
      description: "Create a new project with optional tech stacks",
      method: "POST"
    })
    .input(CreateProjectInputSchema)
    .output(ProjectOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { includedInPortfolio, ...createData } = input;
      const proj = await projectRepository.create(
        { ...createData, userId },
        { includedInPortfolio }
      );
      return toProjectOutput(proj!);
    }),
  update: protectedProcedure
    .route({
      description: "Update a project and its stacks",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: UpdateProjectInputSchema }))
    .output(ProjectOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { includedInPortfolio, ...updateData } = input.data;
      const proj = await projectRepository.update(input.id, userId, updateData, {
        includedInPortfolio
      });
      return proj ? toProjectOutput(proj) : null;
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder projects by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      await projectRepository.reorder(userId, input.items);
      return { success: true };
    }),
  toggleArchived: protectedProcedure
    .route({
      description: "Toggle the archived state of a project",
      method: "POST"
    })
    .input(z.object({ id: z.string() }))
    .output(ToggleProjectArchivedResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const proj = await projectRepository.toggleArchived(input.id, userId);
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const deleted = await projectRepository.delete(input.id, userId);
      return { success: deleted !== null };
    })
};
