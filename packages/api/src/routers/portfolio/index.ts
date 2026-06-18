import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  CreateExperienceInputSchema,
  CreateProjectInputSchema,
  DeleteResponseSchema,
  ExperienceListOutputSchema,
  ExperienceOutputSchema,
  ProjectListOutputSchema,
  ProjectOutputSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  UpdateExperienceInputSchema,
  UpdateProjectInputSchema,
  type ExperienceOutput,
  type ProjectOutput
} from "@tsu-stack/core/portfolio";
import { experienceRepository, projectRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

function toProjectOutput(proj: {
  id: string;
  logo: string | null;
  year: number;
  title: string;
  description: string;
  fromDate: string | null;
  toDate: string | null;
  sortOrder: number;
  experienceId: string | null;
  stacks: Array<{ id: string; name: string; iconUrl: string | null }>;
}): ProjectOutput {
  return {
    id: proj.id,
    logo: proj.logo,
    year: proj.year,
    title: proj.title,
    description: proj.description,
    fromDate: proj.fromDate,
    toDate: proj.toDate,
    sortOrder: proj.sortOrder,
    experienceId: proj.experienceId,
    stacks: proj.stacks.map((stack) => {
      return {
        id: stack.id,
        name: stack.name,
        iconUrl: stack.iconUrl
      };
    })
  };
}

function toExperienceOutput(exp: {
  id: string;
  title: string;
  organization: string;
  description: string;
  fromDate: string | null;
  toDate: string | null;
  sortOrder: number;
  isArchived: boolean | null;
  projects: Array<{
    id: string;
    logo: string | null;
    year: number;
    title: string;
    description: string;
    fromDate: string | null;
    toDate: string | null;
    sortOrder: number;
    experienceId: string | null;
    stacks: Array<{ id: string; name: string; iconUrl: string | null }>;
  }>;
}): ExperienceOutput {
  return {
    id: exp.id,
    title: exp.title,
    organization: exp.organization,
    description: exp.description,
    fromDate: exp.fromDate,
    toDate: exp.toDate,
    sortOrder: exp.sortOrder,
    isArchived: exp.isArchived ?? false,
    projects: exp.projects.map(toProjectOutput)
  };
}

export const portfolioRouter = {
  experiences: {
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
        const all = await experienceRepository.findAll();
        const nextSortOrder = all.length > 0 ? Math.max(...all.map((e) => e.sortOrder)) + 1 : 0;
        const exp = await experienceRepository.create({ sortOrder: nextSortOrder, ...input });
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
        const exp = await experienceRepository.update(input.id, input.data);
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
    toggleArchived: protectedProcedure
      .route({
        description: "Toggle the archived state of an experience",
        method: "POST"
      })
      .input(z.object({ id: z.string() }))
      .output(ExperienceOutputSchema)
      .handler(async ({ input }) => {
        const exp = await experienceRepository.toggleArchived(input.id);
        if (!exp) {
          throw new ORPCError("NOT_FOUND", { message: "Experience not found" });
        }
        return toExperienceOutput(exp);
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
  },
  projects: {
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
        const all = await projectRepository.findAll();
        const nextSortOrder = all.length > 0 ? Math.max(...all.map((p) => p.sortOrder)) + 1 : 0;
        const proj = await projectRepository.create({ sortOrder: nextSortOrder, ...input });
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
        const proj = await projectRepository.update(input.id, input.data);
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
  }
};
