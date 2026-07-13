import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import {
  DetectStacksOutputSchema,
  DetectStacksWorkflowInputSchema,
  groupDependencies
} from "@tsu-stack/core";

// Noise patterns to filter out from dependency lists
const NOISE_PATTERNS = [
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

function isNoisePackage(name: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(name));
}

function parsePackageJson(content: string | null): Record<string, unknown> | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractDepsFromPackageJson(pkg: Record<string, unknown> | null): Record<string, string> {
  if (!pkg) return {};
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  return { ...deps, ...devDeps };
}

const fetchRepoPackageJsons = createStep({
  id: "fetch-repo-package-jsons",
  description: "Parses pre-fetched package.json content into structured data",
  inputSchema: DetectStacksWorkflowInputSchema,
  outputSchema: z.object({
    repoPackages: z.array(
      z.object({
        repo: z.string(),
        rootPkg: z.any().nullable(),
        workspacePkgs: z.array(
          z.object({
            workspace: z.string(),
            pkg: z.any()
          })
        )
      })
    )
  }),
  execute: async ({ inputData }) => {
    const results: Array<{
      repo: string;
      rootPkg: Record<string, unknown> | null;
      workspacePkgs: Array<{ workspace: string; pkg: Record<string, unknown> }>;
    }> = [];

    for (const repoPkg of inputData.repoPackages) {
      try {
        const rootPkg = parsePackageJson(repoPkg.rootPkgContent);

        const workspacePkgs: Array<{
          workspace: string;
          pkg: Record<string, unknown>;
        }> = [];

        for (const wp of repoPkg.workspacePkgContents) {
          const pkg = parsePackageJson(wp.content);
          if (pkg) {
            workspacePkgs.push({ workspace: wp.workspace, pkg });
          }
        }

        results.push({
          repo: repoPkg.repo,
          rootPkg,
          workspacePkgs
        });
      } catch (error) {
        // Log warning and continue with remaining repos
        console.warn(`[detect-stacks] Failed to parse repo ${repoPkg.repo}:`, error);
        results.push({
          repo: repoPkg.repo,
          rootPkg: null,
          workspacePkgs: []
        });
      }
    }

    return { repoPackages: results };
  }
});

const extractDependencies = createStep({
  id: "extract-dependencies",
  description: "Extracts, deduplicates, and groups dependencies from package.json files",
  inputSchema: fetchRepoPackageJsons.outputSchema,
  outputSchema: z.object({
    dependencies: z
      .array(
        z.object({
          name: z.string().describe("npm package name"),
          version: z.string().describe("Version specifier from package.json"),
          repo: z.string().describe("Source repository URL"),
          workspace: z.string().nullable().describe("Workspace name if monorepo, null for root")
        })
      )
      .describe("Deduplicated list of project dependencies"),
    groupedDeps: z
      .array(
        z.object({
          npmPackage: z.string().describe("Primary npm package name (family key)"),
          name: z.string().describe("Human-readable display name"),
          relatedPackages: z
            .array(z.string())
            .describe("Other packages in this group that were merged"),
          repo: z.string().describe("Source repository URL"),
          workspace: z.string().nullable().describe("Workspace name if monorepo")
        })
      )
      .describe("Grouped dependencies — related packages merged under one stack entry")
  }),
  execute: async ({ inputData }) => {
    const allDeps = new Map<
      string,
      { name: string; version: string; repo: string; workspace: string | null }
    >();

    for (const repoPkg of inputData.repoPackages) {
      // Root package.json
      const rootDeps = extractDepsFromPackageJson(repoPkg.rootPkg);
      for (const [name, version] of Object.entries(rootDeps)) {
        if (isNoisePackage(name)) continue;
        if (!allDeps.has(name)) {
          allDeps.set(name, { name, version, repo: repoPkg.repo, workspace: null });
        }
      }

      // Workspace package.json files
      for (const wp of repoPkg.workspacePkgs) {
        const wpDeps = extractDepsFromPackageJson(wp.pkg);
        for (const [name, version] of Object.entries(wpDeps)) {
          if (isNoisePackage(name)) continue;
          if (!allDeps.has(name)) {
            allDeps.set(name, {
              name,
              version,
              repo: repoPkg.repo,
              workspace: wp.workspace
            });
          }
        }
      }
    }

    const rawDeps = Array.from(allDeps.values());

    // Group related packages (e.g., react + react-dom + @types/react → one React stack)
    const groupedDeps = groupDependencies(rawDeps);

    return {
      dependencies: rawDeps,
      groupedDeps
    };
  }
});

const categorizeWithLLM = createStep({
  id: "categorize-with-llm",
  description: "Uses LLM to categorize grouped dependencies into stack types",
  inputSchema: extractDependencies.outputSchema,
  outputSchema: z.object({
    stacks: z.array(
      z.object({
        npmPackage: z.string().describe("Primary npm package name (family key)"),
        name: z.string().describe("Display name (e.g., 'React' not 'react')"),
        type: z
          .string()
          .describe(
            "Stack type: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | other"
          ),
        description: z.string().nullable().describe("One-sentence description"),
        suggestedIcon: z.string().nullable().describe("react-icons component name or null"),
        iconSvg: z
          .string()
          .nullable()
          .describe("24x24 SVG with currentColor, or null if react-icons has match"),
        confidence: z.enum(["high", "medium", "low"]).describe("Categorization confidence"),
        repo: z.string().describe("Source repository URL"),
        relatedPackages: z
          .array(z.string())
          .describe("Other packages in this group (e.g., ['react-dom', '@types/react'])")
      })
    )
  }),
  execute: async ({ inputData, mastra }) => {
    const { groupedDeps } = inputData;

    if (groupedDeps.length === 0) {
      return { stacks: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      console.warn("[detect-stacks] stackCategorizerAgent not found, returning empty stacks");
      return { stacks: [] };
    }

    // Chunk grouped deps into batches of 25 for better LLM processing
    const CHUNK_SIZE = 25;
    const chunks: (typeof groupedDeps)[] = [];
    for (let i = 0; i < groupedDeps.length; i += CHUNK_SIZE) {
      chunks.push(groupedDeps.slice(i, i + CHUNK_SIZE));
    }

    const allStacks: Array<{
      npmPackage: string;
      name: string;
      type: string;
      description: string | null;
      suggestedIcon: string | null;
      iconSvg: string | null;
      confidence: "high" | "medium" | "low";
      repo: string;
      relatedPackages: string[];
    }> = [];

    for (const chunk of chunks) {
      const depList = chunk
        .map(
          (d) =>
            `${d.npmPackage} (from ${d.repo}${d.workspace ? `, workspace: ${d.workspace}` : ""})` +
            (d.relatedPackages.length > 0 ? ` [related: ${d.relatedPackages.join(", ")}]` : "")
        )
        .join("\n");

      const prompt = `Categorize each of these npm dependencies into stack types. Some entries are grouped — related packages are listed in [related:] brackets.

Dependencies:
${depList}

For each dependency, output:
- npmPackage: the primary npm package name (the entry point)
- name: human-readable display name (e.g., "React" not "react", "Tailwind CSS" not "tailwindcss")
- type: one of framework, language, database, ui, auth, deployment, testing, ai, tooling, storage, other
- description: one-sentence description of what this package does
- suggestedIcon: react-icons component name (e.g., "SiReact") if available, otherwise null
- iconSvg: simple SVG string (24x24 viewBox, single path, currentColor) if no react-icons match exists, otherwise null
- confidence: high, medium, or low
- repo: the source repository URL (copy from the dependency list)
- relatedPackages: the list of related packages (copy from [related:] brackets, or empty array if none)

Skip packages that are clearly build-only tools or test utilities.
Focus on packages that represent actual tech stack choices.`;

      try {
        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: {
              schema: z.object({
                stacks: z.array(
                  z.object({
                    npmPackage: z.string(),
                    name: z.string(),
                    type: z.string(),
                    description: z.string().nullable(),
                    suggestedIcon: z.string().nullable(),
                    iconSvg: z.string().nullable(),
                    confidence: z.enum(["high", "medium", "low"]),
                    repo: z.string(),
                    relatedPackages: z.array(z.string())
                  })
                )
              })
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM timeout after 120s")), 120_000)
          )
        ]);

        allStacks.push(...(result.object.stacks ?? []));
      } catch (error) {
        console.error("[detect-stacks] LLM categorization failed for chunk:", error);
        // Fallback: heuristic categorization for this chunk
        for (const dep of chunk) {
          allStacks.push({
            npmPackage: dep.npmPackage,
            name: dep.name,
            type: "other",
            description: null,
            suggestedIcon: null,
            iconSvg: null,
            confidence: "low",
            repo: dep.repo,
            relatedPackages: dep.relatedPackages
          });
        }
      }
    }

    return { stacks: allStacks };
  }
});

type InitData = z.infer<typeof DetectStacksWorkflowInputSchema>;

const deduplicateAndFormat = createStep({
  id: "deduplicate-and-format",
  description: "Deduplicates stacks, checks existing, computes diff",
  inputSchema: categorizeWithLLM.outputSchema,
  outputSchema: DetectStacksOutputSchema,
  execute: async ({ inputData, getInitData }) => {
    const initData = getInitData() as InitData;
    const { stacks } = inputData;

    // Deduplicate by npmPackage
    const seen = new Map<string, (typeof stacks)[number]>();
    for (const stack of stacks) {
      if (!seen.has(stack.npmPackage)) {
        seen.set(stack.npmPackage, stack);
      }
    }
    const uniqueStacks = Array.from(seen.values());

    // Check against existing stacks and aliases
    const existingMap = new Map((initData.existingStacks ?? []).map((s) => [s.npmPackage, s]));
    const dependencyMap = new Map(
      (initData.existingDependencies ?? []).map((d) => [d.npmPackage, d.stackId])
    );

    const enrichedStacks = uniqueStacks.map((stack) => {
      const existing = existingMap.get(stack.npmPackage);
      const depStackId = dependencyMap.get(stack.npmPackage);
      const exists = !!existing || !!depStackId;

      return {
        ...stack,
        exists,
        existingStackId: existing?.id ?? depStackId ?? null,
        health: null as {
          deprecated?: boolean;
          downloads?: number;
          lastPublished?: string;
        } | null
      };
    });

    // Group by repo
    const groupedByRepoMap = new Map<string, typeof enrichedStacks>();
    for (const stack of enrichedStacks) {
      const existing = groupedByRepoMap.get(stack.repo) ?? [];
      existing.push(stack);
      groupedByRepoMap.set(stack.repo, existing);
    }
    const groupedByRepo = Array.from(groupedByRepoMap.entries()).map(([repo, stacks]) => {
      return {
        repo,
        stacks
      };
    });

    // Compute diff against last scan
    const currentPackages = enrichedStacks.map((s) => s.npmPackage);
    const previousPackages = (initData.lastScan?.detectedPackages ?? []) as string[];

    const added = currentPackages.filter((p) => !previousPackages.includes(p));
    const unchanged = currentPackages.filter((p) => previousPackages.includes(p));
    const removed = previousPackages.filter((p) => !currentPackages.includes(p));

    const hasChanges = added.length > 0 || removed.length > 0;

    return {
      detectedStacks: enrichedStacks,
      groupedByRepo,
      hasChanges,
      diff: initData.lastScan ? { added, unchanged, removed } : null
    };
  }
});

export const detectStacksWorkflow = createWorkflow({
  id: "detect-stacks-workflow",
  inputSchema: DetectStacksWorkflowInputSchema,
  outputSchema: DetectStacksOutputSchema
})
  .then(fetchRepoPackageJsons)
  .then(extractDependencies)
  .then(categorizeWithLLM)
  .then(deduplicateAndFormat);

detectStacksWorkflow.commit();
