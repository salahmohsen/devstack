import { createStep } from "@mastra/core/workflows";

import { ResumeImportDraftSchema } from "@tsu-stack/core";

import { normalize } from "#@/mastra/workflows/resume-import-workflow/normalize.step";

export const format = createStep({
  id: "format",
  description: "Validates and returns ResumeImportDraft output",
  inputSchema: normalize.outputSchema,
  outputSchema: ResumeImportDraftSchema,
  execute: async ({ inputData }) =>
    ResumeImportDraftSchema.parse({
      profile: inputData.profile,
      experiences: inputData.experiences,
      projects: inputData.projects,
      stacks: inputData.stacks,
      educations: inputData.educations,
      certifications: inputData.certifications,
      meta: inputData.meta
    })
});
