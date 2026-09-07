import { z } from "zod";

import { type EducationSchemaInsert, type EducationSchemaSelect } from "@tsu-stack/db/types";

/** ISO year-month or year; blank coerces to null. */
const optionalDate = z
  .union([z.string(), z.literal("")])
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
  createdAt: z.string(),
  updatedAt: z.string()
}) satisfies z.ZodType<
  Omit<EducationSchemaSelect, "userId" | "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  }
>;

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

export const UpdateEducationInputSchema = CreateEducationInputSchema.partial().extend({
  school: z.string().min(1).max(200).optional(),
  degree: z.string().min(1).max(200).optional()
});

export const EducationListOutputSchema = z.array(EducationOutputSchema);

export type EducationOutput = z.infer<typeof EducationOutputSchema>;
export type CreateEducationInput = z.infer<typeof CreateEducationInputSchema>;
export type UpdateEducationInput = z.infer<typeof UpdateEducationInputSchema>;
