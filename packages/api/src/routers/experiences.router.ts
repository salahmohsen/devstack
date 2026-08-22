import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  CreateExperienceInputSchema,
  DeleteResponseSchema,
  EXPERIENCES_LIST_PAGE_SIZE,
  ExperienceListOutputSchema,
  ExperienceListPageInputSchema,
  ExperienceListPageOutputSchema,
  ExperienceOutputSchema,
  ListQueryError,
  ReorderInputSchema,
  ReorderResponseSchema,
  UpdateExperienceInputSchema
} from "@tsu-stack/core";
import { experienceRepository } from "@tsu-stack/db/repositories";

import {
  invalidateSearchBrief,
  shouldInvalidateSearchBriefForEntityPatch
} from "#@/lib/application/search-brief";
import { compileListQuery } from "#@/lib/list-query/compile";
import { protectedProcedure } from "#@/lib/procedures/factory";
import { toExperienceListOutput, toExperienceOutput } from "#@/routers/portfolio.mappers";

export const experiencesRouter = {
  /**
   * Full catalog for pickers (project form experience link) and sort normalize.
   * Dashboard list uses `listPage` + infinite scroll instead.
   */
  list: protectedProcedure
    .route({
      description:
        "List all experiences with their projects (full catalog for pickers; grid uses listPage)",
      method: "GET"
    })
    .output(ExperienceListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const experiences = await experienceRepository.findAllByUserId(userId);
      return experiences.map(toExperienceListOutput);
    }),

  /** Cursor page for dashboard infinite scroll. */
  listPage: protectedProcedure
    .route({
      description: "Paginated experiences for dashboard infinite scroll (includes projects)",
      method: "GET"
    })
    .input(ExperienceListPageInputSchema.optional())
    .output(ExperienceListPageOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const limit = input?.limit ?? EXPERIENCES_LIST_PAGE_SIZE;
      let compiled;
      try {
        compiled = compileListQuery({
          resource: "experiences",
          q: input?.q,
          filter: input?.filter,
          sortBy: input?.sortBy,
          sortDir: input?.sortDir
        });
      } catch (error) {
        if (error instanceof ListQueryError) {
          throw new ORPCError("BAD_REQUEST", { message: error.message });
        }
        throw error;
      }
      const page = await experienceRepository.findPageByUserId(userId, {
        cursor: input?.cursor ?? null,
        limit,
        where: compiled.where,
        sortBy: compiled.sortBy,
        sortDir: compiled.sortDir
      });

      return {
        items: page.items.map(toExperienceListOutput),
        nextCursor: page.nextCursor,
        totalCount: page.totalCount
      };
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
      await invalidateSearchBrief(userId, "form");
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
      if (exp && shouldInvalidateSearchBriefForEntityPatch(input.data)) {
        await invalidateSearchBrief(userId, "form");
      }
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
      if (deleted !== null) {
        await invalidateSearchBrief(userId, "form");
      }
      return { success: deleted !== null };
    })
};
