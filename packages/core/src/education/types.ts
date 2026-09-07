import { z } from "zod";

import { type EducationSchemaInsert, type EducationSchemaSelect } from "@tsu-stack/db/types";

/** Freeform date text (year, year-month, or display text); blank coerces to null. */
const optionalDate = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === "" ? null : trimmed;
  });

export const EducationOutputSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  field: z.string().nullable(),
  location: z.string().nullable(),
  fromDate: z.string().nullable(),
  toDate: z.string().nullable(),
  isPresent: z.boolean(),
  description: z.string().nullable(),
  gpa: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date()
}) satisfies z.ZodType<Omit<EducationSchemaSelect, "userId">>;

export const CreateEducationInputSchema = z.object({
  school: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  field: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  fromDate: optionalDate,
  toDate: optionalDate,
  isPresent: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
  gpa: z.string().max(40).nullable().optional()
}) satisfies z.ZodType<
  Omit<EducationSchemaInsert, "id" | "userId" | "createdAt" | "updatedAt" | "sortOrder">
>;

export const UpdateEducationInputSchema = CreateEducationInputSchema.partial();

export const EducationListOutputSchema = z.array(EducationOutputSchema);

export type EducationOutput = z.infer<typeof EducationOutputSchema>;
export type CreateEducationInput = z.infer<typeof CreateEducationInputSchema>;
export type UpdateEducationInput = z.infer<typeof UpdateEducationInputSchema>;
export type EducationListOutput = z.infer<typeof EducationListOutputSchema>;
