import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { contactOutputSchema } from "@tsu-stack/core";
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
  ResumeOutputSchema,
  StackCreateInputSchema,
  StackListOutputSchema,
  StackOutputSchema,
  StackUpdateInputSchema,
  ToggleProjectArchivedResponseSchema,
  UpdateExperienceInputSchema,
  UpdateProjectInputSchema,
  type ExperienceOutput,
  type ProjectOutput,
  type StackOutput
} from "@tsu-stack/core/portfolio";
import { contactRepository, userRepository } from "@tsu-stack/db";
import {
  experienceRepository,
  projectRepository,
  stackRepository
} from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

function toStackOutput(s: {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  enableAi?: boolean | null;
  updatedAt?: Date;
  createdAt?: Date;
}): StackOutput {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    sortOrder: s.sortOrder,
    enableAi: s.enableAi ?? false,
    updatedAt: s.updatedAt ?? new Date(),
    createdAt: s.createdAt ?? new Date()
  };
}

function toProjectOutput(proj: {
  id: string;
  logo: string | null;
  repos: string[] | null;
  demoUrl: string | null;
  year: number;
  title: string;
  summary: string;
  description: string;
  sortOrder: number;
  experienceId: string | null;
  isArchived?: boolean | null;
  isPresent?: boolean | null;
  enableAi?: boolean | null;
  stacks: Array<{
    id: string;
    projectId: string;
    stackId: string;
    stack: {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      sortOrder: number;
      enableAi: boolean | null;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}): ProjectOutput {
  return {
    id: proj.id,
    logo: proj.logo,
    repos: proj.repos ?? [],
    demoUrl: proj.demoUrl,
    year: proj.year,
    title: proj.title,
    summary: proj.summary,
    description: proj.description,
    sortOrder: proj.sortOrder,
    experienceId: proj.experienceId,
    isArchived: proj.isArchived ?? false,
    isPresent: proj.isPresent ?? false,
    enableAi: proj.enableAi ?? false,
    updatedAt: proj.updatedAt ?? new Date(),
    createdAt: proj.createdAt ?? new Date(),
    stacks: proj.stacks
      .map((join) => (join.stack ? toStackOutput(join.stack) : null))
      .filter((s): s is StackOutput => s !== null)
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
  isPresent: boolean | null;
  enableAi: boolean | null;
  projects: Array<{
    id: string;
    logo: string | null;
    repos: string[] | null;
    demoUrl: string | null;
    year: number;
    title: string;
    summary: string;
    description: string;
    sortOrder: number;
    experienceId: string | null;
    isPresent: boolean | null;
    enableAi: boolean | null;
    stacks: Array<{
      id: string;
      projectId: string;
      stackId: string;
      stack: {
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        sortOrder: number;
        enableAi: boolean | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
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
    isPresent: exp.isPresent ?? false,
    enableAi: exp.enableAi ?? false,
    projects: exp.projects.map(toProjectOutput),
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt
  };
}

export const portfolioRouter = {
  resume: {
    get: publicProcedure
      .route({
        description: "Get the resume JSON data",
        method: "GET"
      })
      .output(ResumeOutputSchema)
      .handler(async () => {
        return {
          experiences: [],
          stacks: []
        };
      })
  },
  contact: {
    get: publicProcedure
      .route({
        description: "Get the contact info",
        method: "GET"
      })
      .output(z.array(contactOutputSchema))
      .handler(async ({ context }) => {
        context.logger.set({ route: "portfolio.contact.get" });
        const userRow = await userRepository.findFirst();
        if (!userRow) {
          throw new Error("Session references a user that no longer exists");
        }
        const adminContacts = await contactRepository.findByUserId(userRow.id);

        return (
          adminContacts?.map((c) => {
            return {
              type: c.type,
              value: c.value,
              icon: c.icon,
              updatedAt: c.updatedAt,
              createdAt: c.createdAt
            };
          }) ?? []
        );
      })
  },
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
  },
  stacks: {
    list: publicProcedure
      .route({
        description: "List all tech stacks",
        method: "GET"
      })
      .output(StackListOutputSchema)
      .handler(async () => {
        const stacks = await stackRepository.findAll();
        return stacks.map(toStackOutput);
      }),
    get: publicProcedure
      .route({
        description: "Get a single stack by ID",
        method: "GET"
      })
      .input(z.object({ id: z.string() }))
      .output(StackOutputSchema.nullable())
      .handler(async ({ input }) => {
        const stack = await stackRepository.findById(input.id);
        return stack ? toStackOutput(stack) : null;
      }),
    create: protectedProcedure
      .route({
        description: "Create a new tech stack",
        method: "POST"
      })
      .input(StackCreateInputSchema)
      .output(StackOutputSchema)
      .handler(async ({ input }) => {
        const existing = await stackRepository.findByName(input.name);
        if (existing) {
          throw new ORPCError("CONFLICT", { message: "A stack with this name already exists." });
        }
        const all = await stackRepository.findAll();
        const nextSortOrder = all.length > 0 ? Math.max(...all.map((s) => s.sortOrder)) + 1 : 0;
        const created = await stackRepository.create({
          name: input.name,
          description: input.description ?? null,
          icon: input.icon ?? null,
          sortOrder: nextSortOrder,
          enableAi: input.enableAi ?? false
        });
        return toStackOutput(created!);
      }),
    update: protectedProcedure
      .route({
        description: "Update a tech stack",
        method: "PATCH"
      })
      .input(z.object({ id: z.string(), data: StackUpdateInputSchema }))
      .output(StackOutputSchema.nullable())
      .handler(async ({ input }) => {
        if (input.data.name) {
          const existing = await stackRepository.findByName(input.data.name);
          if (existing && existing.id !== input.id) {
            throw new ORPCError("CONFLICT", { message: "A stack with this name already exists." });
          }
        }
        const updated = await stackRepository.update(input.id, input.data);
        return updated ? toStackOutput(updated) : null;
      }),
    reorder: protectedProcedure
      .route({
        description: "Reorder stacks by updating sort orders",
        method: "POST"
      })
      .input(ReorderInputSchema)
      .output(ReorderResponseSchema)
      .handler(async ({ input }) => {
        await stackRepository.reorder(input.items);
        return { success: true };
      }),
    delete: protectedProcedure
      .route({
        description: "Delete a tech stack and unlink it from all projects",
        method: "DELETE"
      })
      .input(z.object({ id: z.string() }))
      .output(DeleteResponseSchema)
      .handler(async ({ input }) => {
        const deleted = await stackRepository.delete(input.id);
        return { success: deleted !== null };
      })
  }
};
