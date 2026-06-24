import { createWorkflow } from "@mastra/core/workflows";

import { diffFacetsStep } from "#@/workflows/refresh-identity/steps/diff-facets.step";
import { gatherSourcesStep } from "#@/workflows/refresh-identity/steps/gather-sources.step";
import { reindexVectorsStep } from "#@/workflows/refresh-identity/steps/reindex-vectors.step";
import { writeFacetsStep } from "#@/workflows/refresh-identity/steps/write-facets.step";

export const refreshIdentityWorkflow = createWorkflow({
  id: "refresh-identity",
  description:
    "Refreshes the four identity facets (headline, bio, focus_log, narrative) by reading the user's public GitHub repos, asking an LLM to propose updates, auto-writing high-confidence proposals, and re-embedding the changed facets for semantic search. Runs on a cron (scheduled) and from the GitHub webhook on push.",
  inputSchema: gatherSourcesStep.inputSchema,
  outputSchema: reindexVectorsStep.outputSchema
})
  .then(gatherSourcesStep)
  .then(diffFacetsStep)
  .then(writeFacetsStep)
  .then(reindexVectorsStep)
  .commit();
