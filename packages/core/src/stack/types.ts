import { z } from "zod";

import { type StackSchemaInsert, type StackSchemaSelect } from "@tsu-stack/db/types";

export const StackOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  portfolioEntryId: z.string().nullable(),
  includedInPortfolio: z.boolean(),
  updatedAt: z.date(),
  createdAt: z.date()
}) satisfies z.ZodType<StackSchemaSelect>;

export const StackListOutputSchema = z.array(StackOutputSchema);

export const StackCreateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<StackSchemaInsert, "id" | "createdAt" | "updatedAt" | "sortOrder" | "portfolioEntryId">
  >
>;

export const StackUpdateInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<StackSchemaInsert, "id" | "createdAt" | "updatedAt" | "sortOrder" | "portfolioEntryId">
  >
>;

export type StackUpdateInput = z.infer<typeof StackUpdateInputSchema>;
export type StackOutput = z.infer<typeof StackOutputSchema>;
export type StackCreateInput = z.infer<typeof StackCreateInputSchema>;
export type StackListOutput = z.infer<typeof StackListOutputSchema>;
