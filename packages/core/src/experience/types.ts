import { z } from "zod";

import { type ExperienceSchemaInsert, type ExperienceSchemaSelect } from "@tsu-stack/db/types";

import { ListQueryInputSchema } from "#@/list-query/types";
import { ProjectOutputSchema, ProjectPublicOutputSchema } from "#@/project/types";

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
}) satisfies z.ZodType<
  Omit<ExperienceSchemaSelect, "userId"> & {
    includedInPortfolio: boolean;
    projects: z.infer<typeof ProjectOutputSchema>[];
  }
>;

export const ExperiencePublicOutputSchema = ExperienceOutputSchema.extend({
  projects: z.array(ProjectPublicOutputSchema)
});

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

export const ExperienceListOutputSchema = z.array(ExperienceOutputSchema);

/** Default page size for dashboard experiences infinite scroll. */
export const EXPERIENCES_LIST_PAGE_SIZE = 24;

/**
 * Cursor page for dashboard experiences list.
 * Keep `experiences.list` (full array) for pickers / sort full catalog.
 */
export const ExperienceListPageInputSchema = z
  .object({
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
      .describe(`Page size (default ${EXPERIENCES_LIST_PAGE_SIZE})`)
  })
  .extend(ListQueryInputSchema.shape);

export const ExperienceListPageOutputSchema = z.object({
  items: z.array(ExperienceOutputSchema),
  nextCursor: z.string().nullable().describe("Cursor for next page, null if last page"),
  totalCount: z.number().int().nonnegative().describe("Total experiences for the user")
});

export type ExperienceOutput = z.infer<typeof ExperienceOutputSchema>;
export type ExperiencePublicOutput = z.infer<typeof ExperiencePublicOutputSchema>;
export type CreateExperienceInput = z.infer<typeof CreateExperienceInputSchema>;
export type UpdateExperienceInput = z.infer<typeof UpdateExperienceInputSchema>;
export type ExperienceListOutput = z.infer<typeof ExperienceListOutputSchema>;
export type ExperienceListPageInput = z.infer<typeof ExperienceListPageInputSchema>;
export type ExperienceListPageOutput = z.infer<typeof ExperienceListPageOutputSchema>;
