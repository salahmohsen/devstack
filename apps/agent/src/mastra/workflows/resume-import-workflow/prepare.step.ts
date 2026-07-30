import { createStep } from "@mastra/core/workflows";

import { ResumeImportWorkflowInputSchema } from "@tsu-stack/core";

/**
 * Pass-through step: resume text + existing profile/stacks snapshot + source filename.
 * Kept as an explicit step so extract stays focused on LLM work.
 */
export const prepare = createStep({
  id: "prepare",
  description: "Passes resume text and existing profile/stack context into extract",
  inputSchema: ResumeImportWorkflowInputSchema,
  outputSchema: ResumeImportWorkflowInputSchema,
  execute: async ({ inputData }) => {
    return {
      resumeText: inputData.resumeText,
      sourceFilename: inputData.sourceFilename,
      existingProfile: inputData.existingProfile,
      existingStacks: inputData.existingStacks,
      llm: inputData.llm
    };
  }
});
