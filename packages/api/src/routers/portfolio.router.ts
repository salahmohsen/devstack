import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import {
  PortfolioListInputSchema,
  PortfolioListOutputSchema,
  PortfolioToggleInputSchema,
  PortfolioToggleOutputSchema
} from "@tsu-stack/core";
import { contactRepository, getDb, userRepository } from "@tsu-stack/db";
import {
  experienceRepository,
  portfolioEntryRepository,
  projectRepository,
  stackRepository
} from "@tsu-stack/db/repositories";
import { contact, experience, project, stack } from "@tsu-stack/db/schema";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import {
  toContactOutput,
  toExperienceOutput,
  toProjectOutput,
  toStackOutput
} from "#@/routers/portfolio.mappers";
import {
  buildPortfolioEntityFilter,
  isEntityType,
  RsqlFilterError,
  type PortfolioEntityType
} from "#@/routers/portfolio.queries";

async function syncPortfolioFK(
  type: PortfolioEntityType,
  entityId: string,
  portfolioEntryId: string | null
): Promise<void> {
  if (type === "experience") {
    await getDb().update(experience).set({ portfolioEntryId }).where(eq(experience.id, entityId));
  } else if (type === "project") {
    await getDb().update(project).set({ portfolioEntryId }).where(eq(project.id, entityId));
  } else if (type === "stack") {
    await getDb().update(stack).set({ portfolioEntryId }).where(eq(stack.id, entityId));
  } else if (type === "contact") {
    const adminUser = await userRepository.findFirst();
    if (adminUser) {
      await getDb()
        .update(contact)
        .set({ portfolioEntryId })
        .where(and(eq(contact.userId, adminUser.id), eq(contact.type, entityId as never)));
    }
  }
}

async function assertEntityExists(type: PortfolioEntityType, entityId: string): Promise<void> {
  if (type === "experience") {
    const exp = await experienceRepository.findById(entityId);
    if (!exp) throw new ORPCError("NOT_FOUND", { message: "Experience not found" });
    return;
  }
  if (type === "project") {
    const proj = await projectRepository.findById(entityId);
    if (!proj) throw new ORPCError("NOT_FOUND", { message: "Project not found" });
    return;
  }
  if (type === "stack") {
    const stack = await stackRepository.findById(entityId);
    if (!stack) throw new ORPCError("NOT_FOUND", { message: "Stack not found" });
    return;
  }
  const adminUser = await userRepository.findFirst();
  if (!adminUser) {
    throw new ORPCError("NOT_FOUND", { message: "Owner user not found" });
  }
  const existing = await getDb()
    .select({ type: contact.type })
    .from(contact)
    .where(and(eq(contact.userId, adminUser.id), eq(contact.type, entityId as never)))
    .limit(1);
  if (existing.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Contact not found" });
  }
}

async function listAllOptedIn(filterString?: string) {
  const experienceFilter = filterString
    ? buildPortfolioEntityFilter(filterString, "experience")
    : undefined;
  const projectFilter = filterString
    ? buildPortfolioEntityFilter(filterString, "project")
    : undefined;
  const stackFilter = filterString ? buildPortfolioEntityFilter(filterString, "stack") : undefined;
  const contactFilter = filterString
    ? buildPortfolioEntityFilter(filterString, "contact")
    : undefined;

  const experiences = await experienceRepository.findOptedIn(experienceFilter);
  const projects = await projectRepository.findOptedIn(projectFilter);
  const stacks = await stackRepository.findOptedIn(stackFilter);
  const adminUser = await userRepository.findFirst();
  const contacts = adminUser
    ? await contactRepository.findOptedInByUserId(adminUser.id, contactFilter)
    : [];

  return {
    experiences: experiences.map((exp) => toExperienceOutput(exp!)),
    projects: projects.map((proj) => toProjectOutput(proj!)),
    stacks: stacks.map((stack) => toStackOutput(stack!)),
    contacts: contacts.map(toContactOutput)
  };
}

export const PortfolioRouter = {
  list: publicProcedure
    .route({
      description: "List all portfolio entries categorized by type",
      method: "GET"
    })
    .input(PortfolioListInputSchema)
    .output(PortfolioListOutputSchema)
    .errors({
      BAD_REQUEST: {
        message: "Invalid filter",
        status: 400
      }
    })
    .handler(async ({ input }) => {
      try {
        const all = await listAllOptedIn(input.filter);
        return {
          experiences: all.experiences,
          projects: all.projects,
          stacks: all.stacks,
          contacts: all.contacts,
          nextCursor: null
        };
      } catch (error) {
        if (error instanceof RsqlFilterError) {
          throw new ORPCError("BAD_REQUEST", { message: error.message });
        }
        throw error;
      }
    }),
  toggle: protectedProcedure
    .route({
      description: "Toggle inclusion of an entity in the public portfolio",
      method: "POST"
    })
    .input(PortfolioToggleInputSchema)
    .output(PortfolioToggleOutputSchema)
    .handler(async ({ input }) => {
      const { type, entityId, included } = input;

      if (!isEntityType(type)) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Unknown type ${String(type)}`
        });
      }

      await assertEntityExists(type, entityId);

      const existing = await portfolioEntryRepository.findByTypeAndEntityId(type, entityId);

      if (included) {
        if (existing) {
          await syncPortfolioFK(type, entityId, existing.id);
          return { included: true, entry: existing };
        }
        const created = await portfolioEntryRepository.create({
          type,
          entityId
        });
        if (!created) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create portfolio entry"
          });
        }

        await syncPortfolioFK(type, entityId, created.id);
        return { included: true, entry: created };
      }

      if (existing) {
        await portfolioEntryRepository.deleteByTypeAndEntityId(type, entityId);
        await syncPortfolioFK(type, entityId, null);
      }
      return { included: false, entry: null };
    })
};
