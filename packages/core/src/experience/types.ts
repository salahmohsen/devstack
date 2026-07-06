import { z } from "zod";

import { type ExperienceSchemaInsert, type ExperienceSchemaSelect } from "@tsu-stack/db/types";

import { ProjectOutputSchema } from "#@/project/types";

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

export type ExperienceOutput = z.infer<typeof ExperienceOutputSchema>;
export type CreateExperienceInput = z.infer<typeof CreateExperienceInputSchema>;
export type UpdateExperienceInput = z.infer<typeof UpdateExperienceInputSchema>;
export type ExperienceListOutput = z.infer<typeof ExperienceListOutputSchema>;
