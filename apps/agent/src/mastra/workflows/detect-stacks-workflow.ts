import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { DetectStacksOutputSchema, DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

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
  description: "Extracts and deduplicates dependencies from package.json files",
  inputSchema: fetchRepoPackageJsons.outputSchema,
  outputSchema: z.object({
    dependencies: z.array(
      z.object({
        name: z.string().describe("npm package name"),
        version: z.string().describe("Version specifier from package.json"),
        repo: z.string().describe("Source repository URL"),
        workspace: z.string().nullable().describe("Workspace name if monorepo, null for root")
      })
    )
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

    return { dependencies: Array.from(allDeps.values()) };
  }
});

type ExtractedDep = {
  name: string;
  version: string;
  repo: string;
  workspace: string | null;
};

const programmaticMatch = createStep({
  id: "programmatic-match",
  description: "Matches extracted dependencies against existing stack_dependency records",
  inputSchema: extractDependencies.outputSchema,
  outputSchema: z.object({
    matched: z.array(
      z.object({
        npmPackage: z.string(),
        stackId: z.string(),
        name: z.string(),
        repo: z.string(),
        relatedPackages: z.array(z.string())
      })
    ),
    unknown: z.array(
      z.object({
        name: z.string(),
        version: z.string(),
        repo: z.string(),
        workspace: z.string().nullable()
      })
    )
  }),
  execute: async ({ inputData, getInitData }) => {
    const initData = getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;
    console.log(
      `[DEBUG-WF-4b] initData existingStacks: ${initData.existingStacks?.length}, existingDependencies: ${initData.existingDependencies?.length}, lastScan: ${initData.lastScan ? "yes" : "no"}`
    );
    const { dependencies } = inputData;

    // Build lookup: npmPackage → stackId
    const dependencyMap = new Map(
      initData.existingDependencies.map((d) => [d.npmPackage, d.stackId])
    );

    const matched: Array<{
      npmPackage: string;
      stackId: string;
      name: string;
      repo: string;
      relatedPackages: string[];
    }> = [];
    const unknown: ExtractedDep[] = [];

    for (const dep of dependencies) {
      const stackId = dependencyMap.get(dep.name);
      if (stackId) {
        matched.push({
          npmPackage: dep.name,
          stackId,
          name: dep.name,
          repo: dep.repo,
          relatedPackages: []
        });
      } else {
        unknown.push(dep);
      }
    }

    console.log(
      `[DEBUG-WF-5] programmaticMatch complete, matched: ${matched.length}, unknown: ${unknown.length}`
    );
    return { matched, unknown };
  }
});

const aiCategorize = createStep({
  id: "ai-categorize",
  description: "Uses AI to categorize each unknown package one-by-one",
  inputSchema: programmaticMatch.outputSchema,
  outputSchema: z.object({
    matched: z.array(
      z.object({
        npmPackage: z.string(),
        stackId: z.string(),
        name: z.string(),
        repo: z.string(),
        relatedPackages: z.array(z.string())
      })
    ),
    categorized: z.array(
      z.object({
        npmPackage: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string().nullable(),
        confidence: z.enum(["high", "medium", "low"]),
        repo: z.string(),
        relatedPackages: z.array(z.string()),
        iconSvg: z.string().nullable(),
        stackId: z.string().nullable(),
        existingStackId: z.string().nullable()
      })
    )
  }),
  execute: async ({ inputData, mastra, getInitData }) => {
    console.log(
      `[DEBUG-WF-6] aiCategorize started, matched: ${inputData.matched.length}, unknown: ${inputData.unknown.length}`
    );
    const { matched, unknown } = inputData;

    if (unknown.length === 0) {
      return {
        matched,
        categorized: []
      };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      console.warn("[detect-stacks] stackCategorizerAgent not found, skipping AI categorization");
      return {
        matched,
        categorized: unknown.map((dep) => {
          return {
            npmPackage: dep.name,
            name: dep.name,
            type: "other",
            description: null,
            confidence: "low" as const,
            repo: dep.repo,
            relatedPackages: [],
            iconSvg: null,
            stackId: null,
            existingStackId: null
          };
        })
      };
    }

    // Build context: existing stacks with their dependency lists
    const initCtx = getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;
    const existingStacks = initCtx.existingStacks;
    const existingDeps = initCtx.existingDependencies;

    // Group existing dependencies by stackId
    const depsByStack = new Map<string, string[]>();
    for (const dep of existingDeps) {
      const list = depsByStack.get(dep.stackId) ?? [];
      list.push(dep.npmPackage);
      depsByStack.set(dep.stackId, list);
    }

    const existingStackContext = existingStacks
      .map((s) => {
        const deps = depsByStack.get(s.id) ?? [];
        return `- ${s.name} — dependencies: ${deps.join(", ")}`;
      })
      .join("\n");

    const categorized: Array<{
      npmPackage: string;
      name: string;
      type: string;
      description: string | null;
      confidence: "high" | "medium" | "low";
      repo: string;
      relatedPackages: string[];
      iconSvg: string | null;
      stackId: null;
      existingStackId: string | null;
    }> = [];

    // Process each unknown package one-by-one
    const usedNames = new Set<string>();
    for (const dep of unknown) {
      const prompt = `Existing stacks:
${existingStackContext || "(none)"}

Already categorized in this run (REUSE the same name for related packages of the same library/family):
${
  usedNames.size > 0
    ? Array.from(usedNames)
        .map((n) => `- ${n}`)
        .join("\n")
    : "(none)"
}

Package to categorize: ${dep.name}
Repository: ${dep.repo}
Workspace: ${dep.workspace ?? "(root)"}

Decide:
1. Does this belong to an existing stack? (yes/no)
2. If yes: which stack name? (must match existing stack name exactly)
3. If no: what type? (framework/language/database/ui/auth/deployment/testing/ai/tooling/storage/other)
4. What display name? REUSE an existing display name if this package belongs to the same library/family as another package already categorized (e.g. @radix-ui/react-dialog → "Radix UI", @dnd-kit/sortable → "dnd-kit"). Only invent a NEW unique name for genuinely distinct libraries.
5. Confidence: high/medium/low`;

      try {
        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: {
              schema: z.object({
                belongsToExistingStack: z.boolean(),
                existingStackName: z.string().nullable(),
                type: z.string().nullable(),
                displayName: z.string(),
                confidence: z.enum(["high", "medium", "low"]),
                description: z.string().nullable()
              })
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM timeout after 60s")), 60_000)
          )
        ]);

        const ai = result.object;

        if (ai.belongsToExistingStack && ai.existingStackName) {
          // Find matching stack by name
          const match = existingStacks.find(
            (s) => s.name.toLowerCase() === ai.existingStackName!.toLowerCase()
          );
          if (match) {
            categorized.push({
              npmPackage: dep.name,
              name: match.name,
              type: "other", // Inherit from stack; type resolved downstream
              description: null,
              confidence: ai.confidence,
              repo: dep.repo,
              relatedPackages: [],
              iconSvg: null,
              stackId: null,
              existingStackId: match.id
            });
            continue;
          }
        }

        categorized.push({
          npmPackage: dep.name,
          name: ai.displayName,
          type: ai.type ?? "other",
          description: ai.description,
          confidence: ai.confidence,
          repo: dep.repo,
          relatedPackages: [],
          iconSvg: null,
          stackId: null,
          existingStackId: null
        });
        usedNames.add(ai.displayName);
      } catch (error) {
        console.error(`[detect-stacks] AI categorization failed for ${dep.name}:`, error);
        categorized.push({
          npmPackage: dep.name,
          name: dep.name,
          type: "other",
          description: null,
          confidence: "low",
          repo: dep.repo,
          relatedPackages: [],
          iconSvg: null,
          stackId: null,
          existingStackId: null
        });
        usedNames.add(dep.name);
      }
    }

    console.log(`[DEBUG-WF-7] aiCategorize complete, categorized: ${categorized.length}`);
    return { matched, categorized };
  }
});

type InitData = z.infer<typeof DetectStacksWorkflowInputSchema>;

const format = createStep({
  id: "format",
  description: "Merges matched and categorized results, computes diff",
  inputSchema: aiCategorize.outputSchema,
  outputSchema: DetectStacksOutputSchema,
  execute: async ({ inputData, getInitData }) => {
    console.log(
      `[DEBUG-WF-8] format started, matched: ${inputData.matched?.length}, categorized: ${inputData.categorized?.length}`
    );
    const initData = getInitData() as InitData;
    const { matched, categorized } = inputData;

    // Build enriched stacks from matched entries
    const matchedStacks = matched.map(
      (m: {
        npmPackage: string;
        stackId: string;
        name: string;
        repo: string;
        relatedPackages: string[];
      }) => {
        return {
          npmPackage: m.npmPackage,
          name: m.name,
          type: "other",
          description: null,
          confidence: "medium" as const,
          iconSvg: null,
          exists: true,
          existingStackId: m.stackId,
          repo: m.repo,
          relatedPackages: m.relatedPackages,
          health: null as {
            deprecated?: boolean;
            downloads?: number;
            lastPublished?: string;
          } | null
        };
      }
    );

    // Build enriched stacks from categorized entries
    const categorizedStacks = categorized.map(
      (c: {
        npmPackage: string;
        name: string;
        type: string;
        description: string | null;
        confidence: "high" | "medium" | "low";
        repo: string;
        relatedPackages: string[];
        iconSvg: string | null;
        stackId: string | null;
        existingStackId: string | null;
      }) => {
        return {
          npmPackage: c.npmPackage,
          name: c.name,
          type: c.type,
          description: c.description,
          confidence: c.confidence,
          iconSvg: c.iconSvg,
          exists: c.existingStackId !== null,
          existingStackId: c.existingStackId,
          repo: c.repo,
          relatedPackages: c.relatedPackages,
          health: null as {
            deprecated?: boolean;
            downloads?: number;
            lastPublished?: string;
          } | null
        };
      }
    );

    // Merge and deduplicate by npmPackage
    type EnrichedStack = (typeof matchedStacks)[number] | (typeof categorizedStacks)[number];
    const seen = new Map<string, EnrichedStack>();
    for (const stack of [...matchedStacks, ...categorizedStacks]) {
      if (!seen.has(stack.npmPackage)) {
        seen.set(stack.npmPackage, stack);
      }
    }
    const allStacks = Array.from(seen.values());

    // NEW: Group by display name to combine e.g. all Radix UI packages
    const groupedByNameMap = new Map<string, { stacks: typeof allStacks; displayName: string }>();
    for (const stack of allStacks) {
      const existing = groupedByNameMap.get(stack.name);
      if (!existing) {
        groupedByNameMap.set(stack.name, {
          displayName: stack.name,
          stacks: [stack]
        });
      } else {
        // Union related packages, keep the first stack's metadata (name, type, etc.)
        existing.stacks.push(stack);
      }
    }
    const groupedByName = Array.from(groupedByNameMap.entries()).map(([_, value]) => {
      const { displayName, stacks } = value;
      // Merge all packages under this displayName
      // Collect ALL npm packages as relatedPackages so other projects can recognize them
      const allRelatedPackages = Array.from(new Set(stacks.map((s) => s.npmPackage)));
      const merged = {
        ...stacks[0],
        name: displayName,
        relatedPackages: allRelatedPackages
      };
      return merged;
    });

    // Group by repo (for frontend grouping)
    const groupedByRepoMap = new Map<string, typeof groupedByName>();
    for (const stack of groupedByName) {
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
    const currentPackages = groupedByName.map((s) => s.npmPackage);
    const previousPackages = (initData.lastScan?.detectedPackages ?? []) as string[];

    const added = currentPackages.filter((p) => !previousPackages.includes(p));
    const unchanged = currentPackages.filter((p) => previousPackages.includes(p));
    const removed = previousPackages.filter((p) => !currentPackages.includes(p));

    const hasChanges = added.length > 0 || removed.length > 0;

    console.log(
      `[DEBUG-WF-9] format complete, detectedStacks: ${groupedByName.length}, groupedByRepo: ${groupedByRepo.length}`
    );
    return {
      detectedStacks: groupedByName,
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
  .then(programmaticMatch)
  .then(aiCategorize)
  .then(format);

detectStacksWorkflow.commit();
