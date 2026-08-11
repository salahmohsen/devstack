import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import {
  parseUsername,
  PortfolioListInputSchema,
  PortfolioListOutputSchema,
  PortfolioToggleInputSchema,
  PortfolioToggleOutputSchema
} from "@tsu-stack/core";
import { contactRepository, getDb } from "@tsu-stack/db";
import {
  experienceRepository,
  portfolioEntryRepository,
  projectRepository,
  stackRepository,
  userRepository
} from "@tsu-stack/db/repositories";
import { contact, experience, project, stack } from "@tsu-stack/db/schema";

import { enrichProjectsWithGithubRepos } from "#@/lib/portfolio/enrich-project-github-repos";
import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { resolvePublicPortfolioContext } from "#@/lib/public-portfolio/resolve-context";
import {
  toContactOutput,
  toExperiencePublicOutput,
  toProjectPublicOutput,
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
  userId: string,
  portfolioEntryId: string | null
): Promise<void> {
  if (type === "experience") {
    await getDb()
      .update(experience)
      .set({ portfolioEntryId })
      .where(and(eq(experience.id, entityId), eq(experience.userId, userId)));
  } else if (type === "project") {
    await getDb()
      .update(project)
      .set({ portfolioEntryId })
      .where(and(eq(project.id, entityId), eq(project.userId, userId)));
  } else if (type === "stack") {
    await getDb()
      .update(stack)
      .set({ portfolioEntryId })
      .where(and(eq(stack.id, entityId), eq(stack.userId, userId)));
  } else if (type === "contact") {
    await getDb()
      .update(contact)
      .set({ portfolioEntryId })
      .where(and(eq(contact.id, entityId), eq(contact.userId, userId)));
  }
}

async function assertEntityExists(
  type: PortfolioEntityType,
  entityId: string,
  userId: string
): Promise<void> {
  if (type === "experience") {
    const exp = await experienceRepository.findByIdForUser(entityId, userId);
    if (!exp) throw new ORPCError("NOT_FOUND", { message: "Experience not found" });
    return;
  }
  if (type === "project") {
    const proj = await projectRepository.findByIdForUser(entityId, userId);
    if (!proj) throw new ORPCError("NOT_FOUND", { message: "Project not found" });
    return;
  }
  if (type === "stack") {
    const stackRow = await stackRepository.findByIdForUser(entityId, userId);
    if (!stackRow) throw new ORPCError("NOT_FOUND", { message: "Stack not found" });
    return;
  }
  const existing = await getDb()
    .select({ type: contact.type })
    .from(contact)
    .where(and(eq(contact.id, entityId), eq(contact.userId, userId)))
    .limit(1);
  if (existing.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Contact not found" });
  }
}

async function listAllOptedIn(userId: string, filterString?: string) {
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

  const experiences = await experienceRepository.findOptedInByUserId(userId, experienceFilter);
  const projects = await projectRepository.findOptedInByUserId(userId, projectFilter);
  const stacks = await stackRepository.findOptedInByUserId(userId, stackFilter);
  const contacts = await contactRepository.findOptedInByUserId(userId, contactFilter);

  return {
    experiences: experiences.map((exp) => toExperiencePublicOutput(exp!)),
    projects: projects.map((proj) => toProjectPublicOutput(proj!)),
    stacks: stacks.map((stackRow) => toStackOutput(stackRow!)),
    contacts: contacts.map(toContactOutput)
  };
}

export const PortfolioRouter = {
  list: publicProcedure
    .route({
      description: "List all portfolio entries categorized by type for a public profile"
    })
    .input(PortfolioListInputSchema)
    .output(PortfolioListOutputSchema)
    .errors({
      BAD_REQUEST: {
        message: "Invalid filter",
        status: 400
      },
      NOT_FOUND: {
        message: "Profile not found",
        status: 404
      }
    })
    .handler(async ({ input, context, errors }) => {
      try {
        const sessionUserId = context.session?.user?.id ?? null;
        const resolved = await resolvePublicPortfolioContext({
          host: context.host,
          pathUsername: input.username,
          // Dashboard chrome omits username; resolve as the signed-in user.
          sessionUserId
        });
        if (!resolved) {
          // Browser probes (e.g. firebase-messaging-sw.js) and other invalid
          // segments used to match `/$username` and spam ERROR logs.
          const pathLooksLikeProfile = !input.username || parseUsername(input.username).success;
          if (pathLooksLikeProfile) {
            context.logger.set({
              event: "portfolio_list_unresolved",
              host: context.host ?? null,
              pathUsername: input.username ?? null,
              hasSession: Boolean(sessionUserId)
            });
          }
          throw errors.NOT_FOUND();
        }
        const all = await listAllOptedIn(resolved.userId, input.filter);
        // One GitHub list load: enrich top-level projects + nested experience projects together.
        const nested = all.experiences.flatMap((e) => e.projects);
        const enrichedAll = await enrichProjectsWithGithubRepos(
          [...all.projects, ...nested],
          resolved.userId,
          context
        );
        const byId = new Map(enrichedAll.map((p) => [p.id, p]));
        const projects = all.projects.map((p) => byId.get(p.id) ?? { ...p, githubRepos: [] });
        const experiences = all.experiences.map((exp) => {
          return {
            ...exp,
            projects: exp.projects.map((p) => byId.get(p.id) ?? { ...p, githubRepos: [] })
          };
        });
        const owner = await userRepository.findById(resolved.userId);
        const summary = owner?.summary?.trim() ? owner.summary.trim() : null;
        const image = owner?.image?.trim() ? owner.image.trim() : null;
        const name = owner?.name?.trim() ? owner.name.trim() : null;
        return {
          summary,
          image,
          name,
          experiences,
          projects,
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { type, entityId, included } = input;

      if (!isEntityType(type)) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Unknown type ${String(type)}`
        });
      }

      await assertEntityExists(type, entityId, userId);

      const existing = await portfolioEntryRepository.findByTypeAndEntityIdForUser(
        userId,
        type,
        entityId
      );

      if (included) {
        if (existing) {
          await syncPortfolioFK(type, entityId, userId, existing.id);
          return { included: true, entry: existing };
        }
        const created = await portfolioEntryRepository.create({
          userId,
          type,
          entityId
        });
        if (!created) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create portfolio entry"
          });
        }

        await syncPortfolioFK(type, entityId, userId, created.id);
        return { included: true, entry: created };
      }

      if (existing) {
        await portfolioEntryRepository.deleteByTypeAndEntityIdForUser(userId, type, entityId);
        await syncPortfolioFK(type, entityId, userId, null);
      }
      return { included: false, entry: null };
    })
};
