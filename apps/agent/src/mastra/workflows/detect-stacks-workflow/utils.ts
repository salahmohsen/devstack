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
  // workspace: = internal monorepo link (skip as stack). catalog: / catalogs: = real npm package.
  return version.startsWith("workspace:");
}

/** True when the version is only a monorepo catalog alias (still a real external package name). */
export function isCatalogProtocol(version: string): boolean {
  return version.startsWith("catalog:") || version.startsWith("catalogs:");
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

/** Packages per LLM categorize call (smaller = faster progress ticks). */
export const BATCH_CHUNK_SIZE = 20;
/** Per-chunk generate timeout (abort in-flight via withTimeoutSignal). */
export const BATCH_TIMEOUT_MS = 60_000;
/**
 * Soft wall-clock for the whole categorize phase. Stay under reverse-proxy
 * ~310s silent-stream kills so remaining unknowns can soft-fallback and finish.
 */
export const CATEGORIZE_WALL_CLOCK_MS = 260_000;

export type ExtractedDep = {
  name: string;
  version: string;
  repo: string;
  workspace: string | null;
};

export type CategorizedEntry = z.infer<typeof categorizedEntrySchema>;

export type InitData = z.infer<typeof DetectStacksWorkflowInputSchema>;
