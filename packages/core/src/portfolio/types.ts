import { z } from "zod";

import {
  type ExperienceSchemaInsert,
  type ExperienceSchemaSelect,
  type ProjectSchemaInsert,
  type ProjectSchemaSelect,
  type StackSchemaInsert,
  type StackSchemaSelect
} from "@tsu-stack/db/types";

export const StackOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  enableAi: z.boolean(),
  updatedAt: z.date(),
  createdAt: z.date()
}) satisfies z.ZodType<StackSchemaSelect>;

export type StackOutput = z.infer<typeof StackOutputSchema>;

export const StackCreateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  enableAi: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<Omit<StackSchemaInsert, "id" | "createdAt" | "updatedAt" | "sortOrder">>
>;

export type StackCreateInput = z.infer<typeof StackCreateInputSchema>;

export const StackUpdateInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  enableAi: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<Omit<StackSchemaInsert, "id" | "createdAt" | "updatedAt" | "sortOrder">>
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
  enableAi: z.boolean(),
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
  enableAi: z.boolean().optional(),
  stackIds: z.array(z.string()).optional().default([])
}) satisfies z.ZodType<
  Partial<Omit<ProjectSchemaInsert, "id" | "sortOrder" | "updatedAt | createdAt">>
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
  enableAi: z.boolean().optional(),
  stackIds: z.array(z.string()).optional()
}) satisfies z.ZodType<
  Partial<Omit<ProjectSchemaInsert, "id" | "sortOrder" | "updatedAt | createdAt">>
>;

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

// Accepts undefined/null (unset), "" (empty date picker), or a strict
// YYYY-MM-DD string. Normalises "" and undefined to null so downstream
// storage always sees either a valid ISO date or null. Rejects free-form
// strings like "Aug 2024" that would crash date-fns `format()` on the
// dashboard.
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
  isArchived: z.boolean(),
  isPresent: z.boolean(),
  enableAi: z.boolean(),
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
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  enableAi: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<Omit<ExperienceSchemaInsert, "id" | "createdAt" | "updatedAt" | "sortOrder">>
>;

export type CreateExperienceInput = z.infer<typeof CreateExperienceInputSchema>;

export const UpdateExperienceInputSchema = z.object({
  title: z.string().min(1).optional(),
  organization: z.string().min(1).optional(),
  description: z.string(),
  fromDate: ExperienceDateStringSchema,
  toDate: ExperienceDateStringSchema,
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  enableAi: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<Omit<ExperienceSchemaInsert, "id" | "createdAt" | "updatedAt" | "sortOrder">>
>;

export type UpdateExperienceInput = z.infer<typeof UpdateExperienceInputSchema>;

export const ToggleExperienceArchivedResponseSchema = ExperienceOutputSchema;
export type ToggleExperienceArchivedResponse = z.infer<
  typeof ToggleExperienceArchivedResponseSchema
>;

export const ToggleProjectArchivedResponseSchema = ProjectOutputSchema;
export type ToggleProjectArchivedResponse = z.infer<typeof ToggleProjectArchivedResponseSchema>;

export const ReorderInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().min(0)
    })
  )
});

export type ReorderInput = z.infer<typeof ReorderInputSchema>;

export const ReorderResponseSchema = z.object({ success: z.boolean() });
export type ReorderResponse = z.infer<typeof ReorderResponseSchema>;

export const ExperienceListOutputSchema = z.array(ExperienceOutputSchema);
export type ExperienceListOutput = z.infer<typeof ExperienceListOutputSchema>;

export const ProjectListOutputSchema = z.array(ProjectOutputSchema);
export type ProjectListOutput = z.infer<typeof ProjectListOutputSchema>;

export const DeleteResponseSchema = z.object({ success: z.boolean() });
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

export type ResumeOutput = z.infer<typeof ResumeOutputSchema>;

export const ResumeOutputSchema = z.object({
  experiences: ExperienceListOutputSchema,
  stacks: StackListOutputSchema
});
