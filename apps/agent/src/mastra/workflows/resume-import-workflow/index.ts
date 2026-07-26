import { createWorkflow } from "@mastra/core/workflows";

import { ResumeImportDraftSchema, ResumeImportWorkflowInputSchema } from "@tsu-stack/core";

import { extract } from "#@/mastra/workflows/resume-import-workflow/extract.step";
import { format } from "#@/mastra/workflows/resume-import-workflow/format.step";
import { normalize } from "#@/mastra/workflows/resume-import-workflow/normalize.step";
import { prepare } from "#@/mastra/workflows/resume-import-workflow/prepare.step";

export const resumeImportWorkflow = createWorkflow({
  id: "resume-import-workflow",
  inputSchema: ResumeImportWorkflowInputSchema,
  outputSchema: ResumeImportDraftSchema
})
  .then(prepare)
  .then(extract)
  .then(normalize)
  .then(format);

resumeImportWorkflow.commit();
