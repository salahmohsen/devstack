import { createWorkflow } from "@mastra/core/workflows";

import { diffFacetsStep } from "#@/workflows/refresh-identity/steps/diff-facets.step";
import { gatherSourcesStep } from "#@/workflows/refresh-identity/steps/gather-sources.step";
import { reindexVectorsStep } from "#@/workflows/refresh-identity/steps/reindex-vectors.step";
import { writeFacetsStep } from "#@/workflows/refresh-identity/steps/write-facets.step";

export const refreshIdentityWorkflow = createWorkflow({
  id: "refresh-identity",
  inputSchema: gatherSourcesStep.inputSchema,
  outputSchema: reindexVectorsStep.outputSchema
})
  .then(gatherSourcesStep)
  .then(diffFacetsStep)
  .then(writeFacetsStep)
  .then(reindexVectorsStep)
  .commit();
