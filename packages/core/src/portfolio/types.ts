import { z } from "zod";

import {
  type ExperienceSchemaInsert,
  type ExperienceSchemaSelect,
  type ProjectSchemaInsert,
  type ProjectSchemaSelect,
  type StackSchemaInsert,
  type StackSchemaSelect
} from "@tsu-stack/db/types";

export const PortfolioEntryTypeSchema = z.enum(["experience", "project", "stack", "contact"]);
export type PortfolioEntryType = z.infer<typeof PortfolioEntryTypeSchema>;

export const PortfolioEntryOutputSchema = z.object({
  id: z.string().describe("Unique portfolio entry ID"),
  type: PortfolioEntryTypeSchema.describe("Entity type this entry belongs to"),
  entityId: z.string().describe("ID of the entity (experience/project/stack/contact)"),
  createdAt: z.date().describe("When the entry was added to portfolio"),
  updatedAt: z.date().describe("Last update timestamp")
});
export type PortfolioEntryOutput = z.infer<typeof PortfolioEntryOutputSchema>;

export const PortfolioEntryListOutputSchema = z.object({
  experiences: z.array(z.object({ entryId: z.string(), id: z.string() })),
  projects: z.array(z.object({ entryId: z.string(), id: z.string() })),
  stacks: z.array(z.object({ entryId: z.string(), id: z.string() })),
  contacts: z.array(z.object({ entryId: z.string(), userId: z.string(), type: z.string() }))
});
export type PortfolioEntryListOutput = z.infer<typeof PortfolioEntryListOutputSchema>;

export const PortfolioToggleInputSchema = z.object({
  type: PortfolioEntryTypeSchema.describe("Entity type to toggle portfolio inclusion for"),
  entityId: z.string().min(1).describe("ID of the entity to include or exclude"),
  included: z.boolean().describe("`true` to add to portfolio, `false` to remove")
});
export type PortfolioToggleInput = z.infer<typeof PortfolioToggleInputSchema>;

export const PortfolioToggleOutputSchema = z.object({
  included: z.boolean().describe("Whether the entity is now included in portfolio"),
  entry: PortfolioEntryOutputSchema.nullable().describe(
    "Created portfolio entry, or null if removed"
  )
});
export type PortfolioToggleOutput = z.infer<typeof PortfolioToggleOutputSchema>;

export const PortfolioListInputSchema = z.object({
  filter: z.string().optional().describe("RSQL filter string, e.g. `type==experience;year>=2024`"),
  paginated: z.boolean().optional().default(false).describe("Enable cursor-based pagination"),
  cursor: z.string().optional().describe("Cursor from previous response (opaque)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Max items per entity type (1-100)")
});
export type PortfolioListInput = z.infer<typeof PortfolioListInputSchema>;

export const PortfolioListOutputSchema = z.object({
  experiences: z.array(z.any()).describe("Full experience objects with nested projects and stacks"),
  projects: z.array(z.any()).describe("Full project objects with nested stacks"),
  stacks: z.array(z.any()).describe("Full stack objects"),
  contacts: z.array(z.any()).describe("Full contact objects"),
  nextCursor: z.string().nullable().describe("Cursor for next page, null if last page")
});
export type PortfolioListOutput = z.infer<typeof PortfolioListOutputSchema>;

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

export type StackOutput = z.infer<typeof StackOutputSchema>;

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

export type StackCreateInput = z.infer<typeof StackCreateInputSchema>;

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

export const StackListOutputSchema = z.array(StackOutputSchema);
export type StackListOutput = z.infer<typeof StackListOutputSchema>;

export const ProjectOutputSchema = z.object({
  id: z.string(),
  logo: z.string().nullable(),
  repos: z.array(z.string().url()),
  demoUrl: z.string().url().nullable(),
  year: z.number().int(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
  experienceId: z.string().nullable(),
  isArchived: z.boolean(),
  isPresent: z.boolean(),
  portfolioEntryId: z.string().nullable(),
  includedInPortfolio: z.boolean(),
  stacks: z.array(StackOutputSchema),
  updatedAt: z.date(),
  createdAt: z.date()
}) satisfies z.ZodType<ProjectSchemaSelect>;

export type ProjectOutput = z.infer<typeof ProjectOutputSchema>;

export const CreateProjectInputSchema = z.object({
  logo: z.string().nullable().optional(),
  repos: z.array(z.string().url()).optional().default([]),
  demoUrl: z.string().url().nullable().optional(),
  year: z.coerce.number().int(),
  title: z.string().min(1),
  summary: z.string(),
  description: z.string(),
  experienceId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  stackIds: z.array(z.string()).optional().default([]),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<ProjectSchemaInsert, "id" | "sortOrder" | "updatedAt | createdAt" | "portfolioEntryId">
  >
>;

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z.object({
  logo: z.string().nullable().optional(),
  repos: z.array(z.string().url()).optional(),
  demoUrl: z
    .union([z.literal(""), z.string().url()])
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),
  year: z.coerce.number().int().optional(),
  title: z.string().min(1).optional(),
  summary: z.string(),
  description: z.string(),
  experienceId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  stackIds: z.array(z.string()).optional(),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<ProjectSchemaInsert, "id" | "sortOrder" | "updatedAt | createdAt" | "portfolioEntryId">
  >
>;

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

const ExperienceDateStringSchema = z
  .union([z.string().date(), z.literal("")])
  .nullable()
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

export const ExperienceOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  organization: z.string(),
  description: z.string(),
  fromDate: z.string().nullable(),
  toDate: z.string().nullable(),
  sortOrder: z.number().int(),
  isPresent: z.boolean(),
  portfolioEntryId: z.string().nullable(),
  includedInPortfolio: z.boolean(),
  projects: z.array(ProjectOutputSchema),
  updatedAt: z.date(),
  createdAt: z.date()
}) satisfies z.ZodType<ExperienceSchemaSelect>;

export type ExperienceOutput = z.infer<typeof ExperienceOutputSchema>;

export const CreateExperienceInputSchema = z.object({
  title: z.string().min(1),
  organization: z.string().min(1),
  description: z.string(),
  fromDate: ExperienceDateStringSchema,
  toDate: ExperienceDateStringSchema,
  isPresent: z.boolean().optional(),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<
      ExperienceSchemaInsert,
      "id" | "createdAt" | "updatedAt" | "sortOrder" | "portfolioEntryId" | "isArchived"
    >
  >
>;

export type CreateExperienceInput = z.infer<typeof CreateExperienceInputSchema>;

export const UpdateExperienceInputSchema = z.object({
  title: z.string().min(1).optional(),
  organization: z.string().min(1).optional(),
  description: z.string(),
  fromDate: ExperienceDateStringSchema,
  toDate: ExperienceDateStringSchema,
  isPresent: z.boolean().optional(),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<
      ExperienceSchemaInsert,
      "id" | "createdAt" | "updatedAt" | "sortOrder" | "portfolioEntryId" | "isArchived"
    >
  >
>;

export type UpdateExperienceInput = z.infer<typeof UpdateExperienceInputSchema>;

export type { DeleteResponse, ReorderInput, ReorderResponse } from "@tsu-stack/core/common";
export {
  DeleteResponseSchema,
  ReorderInputSchema,
  ReorderResponseSchema
} from "@tsu-stack/core/common";

export const ToggleProjectArchivedResponseSchema = ProjectOutputSchema;
export type ToggleProjectArchivedResponse = z.infer<typeof ToggleProjectArchivedResponseSchema>;

export const ExperienceListOutputSchema = z.array(ExperienceOutputSchema);
export type ExperienceListOutput = z.infer<typeof ExperienceListOutputSchema>;

export const ProjectListOutputSchema = z.array(ProjectOutputSchema);
export type ProjectListOutput = z.infer<typeof ProjectListOutputSchema>;
