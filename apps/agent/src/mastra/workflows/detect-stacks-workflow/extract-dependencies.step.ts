import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { fetchRepoPackageJsons } from "#@/mastra/workflows/detect-stacks-workflow/fetch-repo-package-jsons.step";
import {
  extractDepsFromPackageJson,
  isNoisePackage,
  isWorkspaceProtocol
} from "#@/mastra/workflows/detect-stacks-workflow/utils";

export const extractDependencies = createStep({
  id: "extract-dependencies",
  description:
    "Unions dependencies + devDependencies from every package.json across all selected repos, deduped by npm package name",
  inputSchema: fetchRepoPackageJsons.outputSchema,
  outputSchema: z.object({
    dependencies: z.array(
      z.object({
        name: z.string().describe("npm package name"),
        version: z.string().describe("Version specifier from package.json"),
        repo: z.string().describe("Source repository URL"),
        workspace: z.string().nullable().describe("Package path if monorepo, null for root")
      })
    )
  }),
  execute: async ({ inputData }) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__detect_stacks_extract_deps" });
    // Keyed by npm package name so the same dep across repos / packages appears once.
    const allDeps = new Map<
      string,
      { name: string; version: string; repo: string; workspace: string | null }
    >();

    const addDeps = (deps: Record<string, string>, repo: string, workspace: string | null) => {
      for (const [rawName, version] of Object.entries(deps)) {
        const name = rawName.trim();
        if (!name || isNoisePackage(name) || isWorkspaceProtocol(version)) continue;
        // First occurrence wins (keeps first version/repo/workspace seen).
        if (!allDeps.has(name)) {
          allDeps.set(name, { name, version, repo, workspace });
        }
      }
    };

    let nestedPkgCount = 0;
    for (const repoPkg of inputData.repoPackages) {
      addDeps(extractDepsFromPackageJson(repoPkg.rootPkg), repoPkg.repo, null);

      for (const wp of repoPkg.workspacePkgs) {
        nestedPkgCount += 1;
        addDeps(extractDepsFromPackageJson(wp.pkg), repoPkg.repo, wp.workspace);
      }
    }

    log.set({
      event: "detect_stacks_extract_deps_completed",
      repoCount: inputData.repoPackages.length,
      nestedPkgCount,
      uniqueDepCount: allDeps.size,
      durationMs: Date.now() - started
    });
    log.emit(allDeps.size === 0 ? { _forceKeep: true } : undefined);

    return { dependencies: Array.from(allDeps.values()) };
  }
});
