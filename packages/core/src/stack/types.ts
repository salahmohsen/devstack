import { z } from "zod";

import {
  STACK_ALTERNATIVE_NAME_MAX_LENGTH,
  STACK_ALTERNATIVE_NAMES_MAX,
  normalizeStackAlternativeNames
} from "#@/stack/utils";

export const StackAlternativeNamesSchema = z
  .array(z.string().max(STACK_ALTERNATIVE_NAME_MAX_LENGTH))
  .max(STACK_ALTERNATIVE_NAMES_MAX)
  .transform((names) => normalizeStackAlternativeNames(names));

export const StackDependencyItemSchema = z.object({
  npmPackage: z.string(),
  description: z.string().nullable().optional(),
  homepage: z.string().nullable().optional()
});

export type StackDependencyItem = z.infer<typeof StackDependencyItemSchema>;

export const StackOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  type: z
    .string()
    .nullable()
    .describe(
      "Stack type: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | state management | other"
    ),
  healthStatus: z
    .object({
      deprecated: z.boolean().optional(),
      downloads: z.number().optional(),
      lastPublished: z.string().optional()
    })
    .nullable()
    .describe("Cached npm registry health metadata"),
  confidence: z.string().nullable().describe("LLM categorization confidence (high, medium, low)"),
  projectCount: z.number().int().describe("Number of projects using this stack"),
  sortOrder: z.number().int(),
  isFeatured: z.boolean(),
  portfolioEntryId: z.string().nullable(),
  includedInPortfolio: z.boolean(),
  alternativeNames: z.array(z.string()),
  dependencies: z.array(StackDependencyItemSchema),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      logo: z.string().nullable()
    })
  ),
  updatedAt: z.date(),
  createdAt: z.date()
});

export const StackListOutputSchema = z.array(StackOutputSchema);

/** Default page size for dashboard stacks infinite scroll. */
export const STACKS_LIST_PAGE_SIZE = 24;

/**
 * Cursor page for dashboard stacks grid.
 * Keep `stacks.list` (full array) for pickers / organize normalize.
 */
export const StackListPageInputSchema = z.object({
  cursor: z
    .string()
    .nullable()
    .optional()
    .describe("Opaque cursor from previous page; omit/null for first page"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(`Page size (default ${STACKS_LIST_PAGE_SIZE})`)
});

export const StackListPageOutputSchema = z.object({
  items: z.array(StackOutputSchema),
  nextCursor: z.string().nullable().describe("Cursor for next page, null if last page"),
  totalCount: z.number().int().nonnegative().describe("Total stacks for the user")
});

export const StackCreateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  type: z.string().nullable().optional().describe("Stack type category"),
  includedInPortfolio: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  alternativeNames: StackAlternativeNamesSchema.optional(),
  dependencies: z.array(StackDependencyItemSchema).optional(),
  projectIds: z.array(z.string()).optional()
});

export const StackUpdateInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  type: z.string().nullable().optional().describe("Stack type category"),
  includedInPortfolio: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  alternativeNames: StackAlternativeNamesSchema.optional(),
  dependencies: z.array(StackDependencyItemSchema).optional(),
  projectIds: z.array(z.string()).optional()
});

export type StackUpdateInput = z.infer<typeof StackUpdateInputSchema>;
export type StackOutput = z.infer<typeof StackOutputSchema>;
export type StackCreateInput = z.infer<typeof StackCreateInputSchema>;
export type StackListOutput = z.infer<typeof StackListOutputSchema>;
export type StackListPageInput = z.infer<typeof StackListPageInputSchema>;
export type StackListPageOutput = z.infer<typeof StackListPageOutputSchema>;
