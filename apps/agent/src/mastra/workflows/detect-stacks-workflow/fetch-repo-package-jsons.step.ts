import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { parsePackageJson } from "#@/mastra/workflows/detect-stacks-workflow/utils";

export const fetchRepoPackageJsons = createStep({
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
      } catch {
        // Log warning and continue with remaining repos
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
