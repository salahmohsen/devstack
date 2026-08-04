import { createWorkflow } from "@mastra/core/workflows";

import { ApplyPackageDraftSchema, ApplyPackageWorkflowInputSchema } from "@tsu-stack/core";

import { assembleDraft } from "#@/mastra/workflows/apply-package-workflow/assemble.step";
import { draftSummaryAndLetters } from "#@/mastra/workflows/apply-package-workflow/draft-summary-and-letters.step";
import { prepareContext } from "#@/mastra/workflows/apply-package-workflow/prepare.step";
import { rewriteExperiences } from "#@/mastra/workflows/apply-package-workflow/rewrite-experiences.step";
import { rewriteProjects } from "#@/mastra/workflows/apply-package-workflow/rewrite-projects.step";

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
