import { z } from "zod";

export const StackOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  enableAi: z.boolean()
});

export type StackOutput = z.infer<typeof StackOutputSchema>;

export const StackCreateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  enableAi: z.boolean().optional()
});

export type StackCreateInput = z.infer<typeof StackCreateInputSchema>;

export const StackUpdateInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  enableAi: z.boolean().optional()
});

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
  isPresent: z.boolean(),
  enableAi: z.boolean(),
  stacks: z.array(StackOutputSchema)
});

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
  isPresent: z.boolean().optional(),
  enableAi: z.boolean().optional(),
  stackIds: z.array(z.string()).optional().default([])
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z.object({
  logo: z.string().nullable().optional(),
  repos: z.array(z.string().url()).optional(),
  demoUrl: z.string().url().nullable().optional(),
  year: z.coerce.number().int().optional(),
  title: z.string().min(1).optional(),
  summary: z.string(),
  description: z.string(),
  experienceId: z.string().nullable().optional(),
  isPresent: z.boolean().optional(),
  enableAi: z.boolean().optional(),
  stackIds: z.array(z.string()).optional()
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

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
  projects: z.array(ProjectOutputSchema)
});

export type ExperienceOutput = z.infer<typeof ExperienceOutputSchema>;

export const CreateExperienceInputSchema = z.object({
  title: z.string().min(1),
  organization: z.string().min(1),
  description: z.string(),
  fromDate: z.string().nullable().optional(),
  toDate: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  enableAi: z.boolean().optional()
});

export type CreateExperienceInput = z.infer<typeof CreateExperienceInputSchema>;

export const UpdateExperienceInputSchema = z.object({
  title: z.string().min(1).optional(),
  organization: z.string().min(1).optional(),
  description: z.string(),
  fromDate: z.string().nullable().optional(),
  toDate: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  enableAi: z.boolean().optional()
});

export type UpdateExperienceInput = z.infer<typeof UpdateExperienceInputSchema>;

export const ToggleExperienceArchivedResponseSchema = ExperienceOutputSchema;
export type ToggleExperienceArchivedResponse = z.infer<
  typeof ToggleExperienceArchivedResponseSchema
>;

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
