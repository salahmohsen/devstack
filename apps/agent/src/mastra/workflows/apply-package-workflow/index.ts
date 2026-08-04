import { createWorkflow } from "@mastra/core/workflows";

import { ApplyPackageDraftSchema, ApplyPackageWorkflowInputSchema } from "@tsu-stack/core";

import { assembleDraft } from "#@/mastra/workflows/apply-package-workflow/assemble.step";
import { draftSummaryAndLetters } from "#@/mastra/workflows/apply-package-workflow/draft-summary-and-letters.step";
import { prepareContext } from "#@/mastra/workflows/apply-package-workflow/prepare.step";
import { rewriteExperiences } from "#@/mastra/workflows/apply-package-workflow/rewrite-experiences.step";
import { rewriteProjects } from "#@/mastra/workflows/apply-package-workflow/rewrite-projects.step";

export {
  prepareContext,
  rewriteExperiences,
  rewriteProjects,
  draftSummaryAndLetters,
  assembleDraft
};
export {
  applyPackageRequestContext,
  raceGenerate,
  REWRITE_CHUNK_TIMEOUT_MS,
  LETTERS_TIMEOUT_MS,
  REWRITE_MAX_OUTPUT_TOKENS,
  LETTERS_MAX_OUTPUT_TOKENS
} from "#@/mastra/workflows/apply-package-workflow/llm-shared";
export {
  ApplyPackageJobBriefSchema,
  ApplyPackageWorkflowStateSchema,
  type ApplyPackageJobBrief,
  type ApplyPackageWorkflowState
} from "#@/mastra/workflows/apply-package-workflow/workflow-state";

export const applyPackageWorkflow = createWorkflow({
  id: "apply-package-workflow",
  inputSchema: ApplyPackageWorkflowInputSchema,
  outputSchema: ApplyPackageDraftSchema
})
  .then(prepareContext)
  .then(rewriteExperiences)
  .then(rewriteProjects)
  .then(draftSummaryAndLetters)
  .then(assembleDraft);

applyPackageWorkflow.commit();
