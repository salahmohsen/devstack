import { createWorkflow } from "@mastra/core/workflows";

import { ApplyPackageDraftSchema, ApplyPackageWorkflowInputSchema } from "@tsu-stack/core";

import { assembleDraft } from "#@/mastra/workflows/apply-package-workflow/assemble.step";
import { draftSummaryAndLetters } from "#@/mastra/workflows/apply-package-workflow/draft-summary-and-letters.step";
import { prepareContext } from "#@/mastra/workflows/apply-package-workflow/prepare.step";
import { rewriteExperiences } from "#@/mastra/workflows/apply-package-workflow/rewrite-experiences.step";
import { rewriteProjects } from "#@/mastra/workflows/apply-package-workflow/rewrite-projects.step";
import {
  ApplyPackageWorkflowStateSchema,
  type ApplyPackageWorkflowState
} from "#@/mastra/workflows/apply-package-workflow/workflow-state";

export const applyPackageWorkflow = createWorkflow({
  id: "apply-package-workflow",
  inputSchema: ApplyPackageWorkflowInputSchema,
  outputSchema: ApplyPackageDraftSchema
})
  .then(prepareContext)
  // Experience and project rewrites only need the portfolio snapshot + job brief.
  .parallel([rewriteExperiences, rewriteProjects])
  .map(async ({ inputData }) => {
    const experiencesState = inputData["rewrite-experiences"] as ApplyPackageWorkflowState;
    const projectsState = inputData["rewrite-projects"] as ApplyPackageWorkflowState;
    const merged: ApplyPackageWorkflowState = {
      ...experiencesState,
      experienceRewrites: experiencesState.experienceRewrites,
      projectRewrites: projectsState.projectRewrites
    };
    return ApplyPackageWorkflowStateSchema.parse(merged);
  })
  .then(draftSummaryAndLetters)
  .then(assembleDraft);

applyPackageWorkflow.commit();
