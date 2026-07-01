import { z } from "zod";

import { type GithubConfigSchemaInsert, type GithubConfigSchemaSelect } from "@tsu-stack/db/types";

export const GitHubUsernameSchema = z
  .string()
  .trim()
  .min(1, "GitHub username is required.")
  .max(39, "GitHub username is too long.")
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?$/, "Enter a valid GitHub username.");

export const GITHUB_TOKEN_MASK = "••••••••••••••••";

export const GithubConfigOutputSchema = z.object({
  githubToken: z.string().nullable(),
  githubUsername: GitHubUsernameSchema.nullable(),
  hasGithubToken: z.boolean(),
  updatedAt: z.coerce.date()
}) satisfies z.ZodType<Omit<GithubConfigSchemaSelect, "userId" | "createdAt">>;

export type GithubConfigOutput = z.infer<typeof GithubConfigOutputSchema>;

export const UpdateGithubConfigInputSchema = z.object({
  clearGithubToken: z.boolean(),
  githubToken: z.string().trim().optional(),
  githubUsername: GitHubUsernameSchema
}) satisfies z.ZodType<
  Partial<Omit<GithubConfigSchemaInsert, "userId" | "createdAt" | "updatedAt">>
>;

export type UpdateGithubConfigInput = z.infer<typeof UpdateGithubConfigInputSchema>;
