import { createStep } from "@mastra/core/workflows";

import {
  ApplyPackageDraftSchema,
  assembleApplyPackageDraft,
  type ApplyPackageDraft
} from "@tsu-stack/core";

import {
  ApplyPackageWorkflowStateSchema,
  type ApplyPackageWorkflowState
} from "#@/mastra/workflows/apply-package-workflow/workflow-state";

export const assembleDraft = createStep({
  id: "assemble-draft",
  description: "Merge rewrites + letters into a full ApplyPackageDraft",
  inputSchema: ApplyPackageWorkflowStateSchema,
  outputSchema: ApplyPackageDraftSchema,
  execute: async ({ inputData }): Promise<ApplyPackageDraft> => {
    const state = inputData as ApplyPackageWorkflowState;

    if (!state.letters) {
      throw new Error("assemble-draft: letters missing");
    }

    return assembleApplyPackageDraft({
      applicationId: state.applicationId,
      jobContext: state.jobContext,
      portfolio: state.portfolio,
      experienceRewrites: state.experienceRewrites,
      projectRewrites: state.projectRewrites,
      letters: state.letters
    });
  }
});
