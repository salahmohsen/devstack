import { type z } from "zod";

import { type DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { type categorizedEntrySchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";

// Noise patterns to filter out from dependency lists
export const NOISE_PATTERNS = [
  /^@types\//, // TypeScript type definitions
  /^@repo\//, // Internal workspace packages
  /^@workspace\//, // Internal workspace packages
  /^typescript$/, // Build-only tools
  /^@tsconfig\//, // TypeScript configs
  /^eslint/, // Linting
  /^prettier/, // Formatting
  /^@eslint\//, // ESLint plugins
  /^@prettier\//, // Prettier plugins
  /^jest$/, // Testing
  /^vitest$/, // Testing
  /^@jest\//, // Jest plugins
  /^@vitest\//, // Vitest plugins
  /^ts-jest$/, // Testing
  /^ts-node$/, // Runtime
  /^tsx$/, // Runtime
  /^nodemon$/, // Dev tools
  /^concurrently$/, // Dev tools
  /^npm-run-all/, // Dev tools
  /^rimraf$/, // Dev tools
  /^@changesets\//, // Release tooling
  /^changesets$/, // Release tooling
  /^@size-limit\//, // Bundle size
  /^size-limit$/ // Bundle size
];

export function isNoisePackage(name: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(name));
}

export function isWorkspaceProtocol(version: string): boolean {
  return version.startsWith("workspace:");
}

export function parsePackageJson(content: string | null): Record<string, unknown> | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractDepsFromPackageJson(
  pkg: Record<string, unknown> | null
): Record<string, string> {
  if (!pkg) return {};
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  return { ...deps, ...devDeps };
}

export const BATCH_CHUNK_SIZE = 25;
export const BATCH_TIMEOUT_MS = 180_000;

export type ExtractedDep = {
  name: string;
  version: string;
  repo: string;
  workspace: string | null;
};

export type CategorizedEntry = z.infer<typeof categorizedEntrySchema>;

export type InitData = z.infer<typeof DetectStacksWorkflowInputSchema>;
