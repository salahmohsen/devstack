import { z } from "zod";

/**
 * GitHub portfolio identity helpers.
 * Classic PAT config (token CRUD) has been removed — OAuth via Better Auth is the only credential source.
 */

export const GitHubUsernameSchema = z
  .string()
  .trim()
  .min(1, "GitHub username is required.")
  .max(39, "GitHub username is too long.")
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?$/, "Enter a valid GitHub username.");

/** @deprecated PAT mask no longer used; kept for any residual imports during migration. */
export const GITHUB_TOKEN_MASK = "••••••••••••••••";
