import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { fetchRepoPackageJsons } from "#@/mastra/workflows/detect-stacks-workflow/fetch-repo-package-jsons.step";
import {
  extractDepsFromPackageJson,
  isNoisePackage,
  isWorkspaceProtocol
} from "#@/mastra/workflows/detect-stacks-workflow/utils";

export const extractDependencies = createStep({
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
        if (isNoisePackage(name) || isWorkspaceProtocol(version)) continue;
        if (!allDeps.has(name)) {
          allDeps.set(name, { name, version, repo: repoPkg.repo, workspace: null });
        }
      }

      // Workspace package.json files
      for (const wp of repoPkg.workspacePkgs) {
        const wpDeps = extractDepsFromPackageJson(wp.pkg);
        for (const [name, version] of Object.entries(wpDeps)) {
          if (isNoisePackage(name) || isWorkspaceProtocol(version)) continue;
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
