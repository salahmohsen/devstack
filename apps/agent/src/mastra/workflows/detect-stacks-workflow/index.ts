import { createWorkflow } from "@mastra/core/workflows";

import { DetectStacksOutputSchema, DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { aiCategorize } from "#@/mastra/workflows/detect-stacks-workflow/ai-categorize.step";
import { deduplicateGroups } from "#@/mastra/workflows/detect-stacks-workflow/deduplicate-groups.step";
import { extractDependencies } from "#@/mastra/workflows/detect-stacks-workflow/extract-dependencies.step";
import { fetchRepoPackageJsons } from "#@/mastra/workflows/detect-stacks-workflow/fetch-repo-package-jsons.step";
import { format } from "#@/mastra/workflows/detect-stacks-workflow/format.step";
import { programmaticMatch } from "#@/mastra/workflows/detect-stacks-workflow/programmatic-match.step";
import { resolveIcons } from "#@/mastra/workflows/detect-stacks-workflow/resolve-icons.step";

export const detectStacksWorkflow = createWorkflow({
  id: "detect-stacks-workflow",
  inputSchema: DetectStacksWorkflowInputSchema,
  outputSchema: DetectStacksOutputSchema
})
  .then(fetchRepoPackageJsons)
  .then(extractDependencies)
  .then(programmaticMatch)
  .then(aiCategorize)
  .then(deduplicateGroups)
  .then(resolveIcons)
  .then(format);

detectStacksWorkflow.commit();
