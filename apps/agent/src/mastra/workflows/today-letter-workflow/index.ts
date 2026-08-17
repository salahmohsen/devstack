import { createWorkflow } from "@mastra/core/workflows";

import { TodayLetterWorkflowInputSchema, TodayLetterWorkflowOutputSchema } from "@tsu-stack/core";

import { gatherFactsStep } from "#@/mastra/workflows/today-letter-workflow/gather-facts.step";
import { writeLetterStep } from "#@/mastra/workflows/today-letter-workflow/write-letter.step";

/**
 * Same-turn Today letter: windowed facts, then markdown. No writer LLM.
 */
export const todayLetterWorkflow = createWorkflow({
  id: "today-letter-workflow",
  inputSchema: TodayLetterWorkflowInputSchema,
  outputSchema: TodayLetterWorkflowOutputSchema
})
  .then(gatherFactsStep)
  .then(writeLetterStep);

todayLetterWorkflow.commit();
