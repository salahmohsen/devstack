import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";

/**
 * What the client sends (just projectId + repos)
 */
export const DetectStacksClientInputSchema = z.object({
  projectId: z.string().describe("The project ID to detect stacks for"),
  repos: z.array(z.string().url().describe("GitHub repository URLs to scan"))
});

/**
 * What the workflow receives (enriched by oRPC handler with pre-fetched data)
 */
export const DetectStacksWorkflowInputSchema = z.object({
  projectId: z.string(),
  repoPackages: z
    .array(
      z.object({
        repo: z.string().describe("Repository URL"),
        rootPkgContent: z
          .string()
          .nullable()
          .describe("Raw JSON content of root package.json, null if not found"),
        workspaceYamlContent: z
          .string()
          .nullable()
          .describe("Raw content of pnpm-workspace.yaml when present (diagnostic only)"),
        workspacePkgContents: z
          .array(
            z.object({
              workspace: z
                .string()
                .describe("Package directory path relative to repo root (e.g. apps/web)"),
              content: z.string().describe("Raw JSON content of that package.json")
            })
          )
          .describe(
            "Every nested package.json in the repo (monorepo packages, nested apps). Root is rootPkgContent."
          )
      })
    )
    .describe("Pre-fetched package.json content from each selected repository"),
  existingStacks: z
    .array(
      z.object({
        id: z.string().describe("Existing stack ID in database"),
        name: z.string().describe("Display name of existing stack")
      })
    )
    .describe("Stacks already in the database (for deduplication)"),
  existingDependencies: z
    .array(
      z.object({
        npmPackage: z.string().describe("npm package name that maps to a stack"),
        stackId: z.string().describe("The stack ID this dependency points to")
      })
    )
    .describe("Existing npm package to stack mappings (for deduplication)"),
  lastScan: z
    .object({
      detectedPackages: z.array(z.string()).describe("npm packages from previous scan")
    })
    .nullable()
    .describe("Previous scan result for diff, null if first scan"),
  /** Server-resolved BYO model + key. Never log `llm.apiKey`. */
  llm: RuntimeLlmConfigSchema.optional()
});

/**
 * One stack in the detector.
 * This is what the LLM outputs via structured output.
 */
export const DetectedStackSchema = z
  .object({
    npmPackage: z.string().describe("npm package name (e.g., 'react', 'tailwindcss')"),
    name: z.string().describe("Human-readable display name (e.g., 'React', 'Tailwind CSS')"),
    type: z
      .string()
      .describe(
        "Stack type category: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | state management | other"
      ),
    description: z.string().nullable().describe("One-sentence description"),
    confidence: z
      .enum(["high", "medium", "low"])
      .describe("How confident you are in this categorization"),
    iconSvg: z.string().nullable().describe("SVG icon markup for the stack"),
    exists: z.boolean().describe("Whether this stack already exists in the database"),
    existingStackId: z.string().nullable().describe("ID of existing stack if exists=true"),
    repo: z.string().describe("Source repository URL this dependency was found in"),
    relatedPackages: z
      .array(z.string())
      .describe(
        "Other npm packages grouped under this stack (e.g., ['react-dom', '@types/react'])"
      ),
    health: z
      .object({
        deprecated: z
          .boolean()
          .optional()
          .describe("Whether the package is marked deprecated on npm"),
        downloads: z.number().optional().describe("Weekly npm downloads"),
        lastPublished: z
          .string()
          .optional()
          .describe("ISO date of latest publish, null if unavailable")
      })
      .nullable()
      .describe("npm registry health metadata")
  })
  .describe("Standalone stack output for LLM categorization");

/**
 * Container outputs: all detected stacks + diff info
 */
export const DetectStacksOutputSchema = z.object({
  detectedStacks: z.array(DetectedStackSchema).describe("All detected stacks across all repos"),
  groupedByRepo: z
    .array(
      z.object({
        repo: z.string().describe("Repository URL"),
        stacks: z.array(DetectedStackSchema).describe("Stacks found in this repo")
      })
    )
    .describe("Stacks grouped by their source repository"),
  hasChanges: z.boolean().describe("Whether there are new or removed packages since last scan"),
  diff: z
    .object({
      added: z.array(z.string()).describe("npm packages found this time but not last time"),
      unchanged: z.array(z.string()).describe("npm packages found both times"),
      removed: z.array(z.string()).describe("npm packages found last time but not this time")
    })
    .nullable()
    .describe("Diff against previous scan, null if first scan")
});

export type DetectedStack = z.infer<typeof DetectedStackSchema>;
export type DetectStacksResult = {
  detectedStacks: DetectedStack[];
  groupedByRepo: Array<{
    repo: string;
    stacks: DetectedStack[];
  }>;
  hasChanges: boolean;
  diff: {
    added: string[];
    unchanged: string[];
    removed: string[];
  } | null;
  currentStep: string | null;
};
