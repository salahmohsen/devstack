import { z } from "zod";

export const GitHubUsernameSchema = z
  .string()
  .trim()
  .min(1, "GitHub username is required.")
  .max(39, "GitHub username is too long.")
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?$/, "Enter a valid GitHub username.");

export const GITHUB_TOKEN_MASK = "••••••••••••••••";

export const AppSettingsOutputSchema = z.object({
  githubToken: z.string().nullable(),
  githubUsername: GitHubUsernameSchema.nullable(),
  hasGithubToken: z.boolean(),
  updatedAt: z.iso.datetime().nullable()
});

export type AppSettingsOutput = z.infer<typeof AppSettingsOutputSchema>;

export const UpdateAppSettingsInputSchema = z.object({
  clearGithubToken: z.boolean(),
  githubToken: z.string().trim().optional(),
  githubUsername: GitHubUsernameSchema
});

export type UpdateAppSettingsInput = z.infer<typeof UpdateAppSettingsInputSchema>;
