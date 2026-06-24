import { z } from "zod";

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
  updatedAt: z.iso.datetime().nullable()
});

export type GithubConfigOutput = z.infer<typeof GithubConfigOutputSchema>;

export const UpdateGithubConfigInputSchema = z.object({
  clearGithubToken: z.boolean(),
  githubToken: z.string().trim().optional(),
  githubUsername: GitHubUsernameSchema
});

export type UpdateGithubConfigInput = z.infer<typeof UpdateGithubConfigInputSchema>;
