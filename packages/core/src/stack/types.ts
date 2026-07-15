import { z } from "zod";

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
  portfolioEntryId: z.string().nullable(),
  includedInPortfolio: z.boolean(),
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

export const StackCreateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  type: z.string().nullable().optional().describe("Stack type category"),
  includedInPortfolio: z.boolean().optional(),
  dependencies: z.array(StackDependencyItemSchema).optional(),
  projectIds: z.array(z.string()).optional()
});

export const StackUpdateInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  type: z.string().nullable().optional().describe("Stack type category"),
  includedInPortfolio: z.boolean().optional(),
  dependencies: z.array(StackDependencyItemSchema).optional(),
  projectIds: z.array(z.string()).optional()
});

export type StackUpdateInput = z.infer<typeof StackUpdateInputSchema>;
export type StackOutput = z.infer<typeof StackOutputSchema>;
export type StackCreateInput = z.infer<typeof StackCreateInputSchema>;
export type StackListOutput = z.infer<typeof StackListOutputSchema>;
