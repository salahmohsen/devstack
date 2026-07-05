import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  DeleteResponseSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  StackCreateInputSchema,
  StackListOutputSchema,
  StackOutputSchema,
  StackUpdateInputSchema
} from "@tsu-stack/core/portfolio";
import { stackRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { toStackOutput } from "#@/routers/portfolio.mappers";

export const portfolioStacksRouter = {
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
      const { includedInPortfolio, name, description, icon } = input;
      const existing = await stackRepository.findByName(name);
      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "A stack with this name already exists."
        });
      }
      const all = await stackRepository.findAll();
      const nextSortOrder = all.length > 0 ? Math.max(...all.map((s) => s.sortOrder)) + 1 : 0;
      const created = await stackRepository.create(
        { name, description: description ?? null, icon: icon ?? null, sortOrder: nextSortOrder },
        { includedInPortfolio }
      );
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
      const { includedInPortfolio, ...updateData } = input.data;
      if (updateData.name) {
        const existing = await stackRepository.findByName(updateData.name);
        if (existing && existing.id !== input.id) {
          throw new ORPCError("CONFLICT", {
            message: "A stack with this name already exists."
          });
        }
      }
      const updated = await stackRepository.update(input.id, updateData, { includedInPortfolio });
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
};
