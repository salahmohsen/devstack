import { z } from "zod";

import { type ProjectSchemaInsert, type ProjectSchemaSelect } from "@tsu-stack/db/types";

import { StackOutputSchema } from "#@/stack/types";

export const ProjectOutputSchema = z.object({
  id: z.string(),
  logo: z.string().nullable(),
  repos: z.array(z.url()),
  demoUrl: z.url().nullable(),
  year: z.number().int(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
  experienceId: z.string().nullable(),
  isArchived: z.boolean(),
  isPresent: z.boolean(),
  analysis: z.string().nullable(),
  portfolioEntryId: z.string().nullable(),
  includedInPortfolio: z.boolean(),
  stacks: z.array(StackOutputSchema),
  stackTypeSummary: z
    .record(z.string(), z.number())
    .describe("Stack counts grouped by type (e.g., { framework: 2, ui: 3 })"),
  updatedAt: z.date(),
  createdAt: z.date()
}) satisfies z.ZodType<
  Omit<ProjectSchemaSelect, "userId"> & {
    includedInPortfolio: boolean;
    stacks: z.infer<typeof StackOutputSchema>[];
    stackTypeSummary: Record<string, number>;
  }
>;

/** GitHub repo linked on a public portfolio project (enriched server-side). */
export const ProjectGithubRepoPublicSchema = z.object({
  name: z.string().describe("Repo name path segment for in-app public GitHub routes"),
  fullName: z.string().describe("owner/name for display and a11y"),
  isPrivate: z.boolean().describe("GitHub private flag; private buttons only for portfolio owner")
});
export type ProjectGithubRepoPublic = z.infer<typeof ProjectGithubRepoPublicSchema>;

export const ProjectPublicOutputSchema = ProjectOutputSchema.omit({ analysis: true }).extend({
  githubRepos: z
    .array(ProjectGithubRepoPublicSchema)
    .default([])
    .describe("Resolvable GitHub repos for Open-repo controls (tenant-owned only)")
});

export const ProjectListOutputSchema = z.array(ProjectOutputSchema);

/** Default page size for dashboard projects infinite scroll. */
export const PROJECTS_LIST_PAGE_SIZE = 24;

/**
 * Cursor page for dashboard projects list.
 * Keep `projects.list` (full array) for pickers / sort full catalog.
 */
export const ProjectListPageInputSchema = z.object({
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
    .describe(`Page size (default ${PROJECTS_LIST_PAGE_SIZE})`)
});

export const ProjectListPageOutputSchema = z.object({
  items: z.array(ProjectOutputSchema),
  nextCursor: z.string().nullable().describe("Cursor for next page, null if last page"),
  totalCount: z.number().int().nonnegative().describe("Total projects for the user")
});

export const CreateProjectInputSchema = z.object({
  logo: z.string().nullable().optional(),
  repos: z.array(z.url()).optional().default([]),
  demoUrl: z.url().nullable().optional(),
  year: z.coerce.number().int(),
  title: z.string().min(1),
  summary: z.string(),
  description: z.string(),
  experienceId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  analysis: z.string().nullable().optional(),
  stackIds: z.array(z.string()).optional().default([]),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<ProjectSchemaInsert, "id" | "sortOrder" | "updatedAt" | "createdAt" | "portfolioEntryId">
  >
>;

export const UpdateProjectInputSchema = z.object({
  logo: z.string().nullable().optional(),
  repos: z.array(z.url()).optional(),
  demoUrl: z
    .union([z.literal(""), z.url()])
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),
  year: z.coerce.number().int().optional(),
  title: z.string().min(1).optional(),
  // Partial update: omit to leave unchanged (e.g. detect-stacks attach stackIds only).
  summary: z.string().optional(),
  description: z.string().optional(),
  experienceId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  analysis: z.string().nullable().optional(),
  stackIds: z.array(z.string()).optional(),
  includedInPortfolio: z.boolean().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<ProjectSchemaInsert, "id" | "sortOrder" | "updatedAt" | "createdAt" | "portfolioEntryId">
  >
>;

export const ToggleProjectArchivedResponseSchema = ProjectOutputSchema;

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type ProjectOutput = z.infer<typeof ProjectOutputSchema>;
export type ProjectPublicOutput = z.infer<typeof ProjectPublicOutputSchema>;
export type ToggleProjectArchivedResponse = z.infer<typeof ToggleProjectArchivedResponseSchema>;
export type ProjectListOutput = z.infer<typeof ProjectListOutputSchema>;
export type ProjectListPageInput = z.infer<typeof ProjectListPageInputSchema>;
export type ProjectListPageOutput = z.infer<typeof ProjectListPageOutputSchema>;
