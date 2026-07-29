import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  heuristicClassifyMail,
  MailClassifyInputSchema,
  MailClassifyOutputSchema
} from "@tsu-stack/core";

export const heuristicStep = createStep({
  id: "heuristic-classify",
  description: "Cheap keyword/prefilter classification before any LLM call",
  inputSchema: MailClassifyInputSchema,
  outputSchema: z.object({
    original: MailClassifyInputSchema,
    result: MailClassifyOutputSchema
  }),
  execute: async ({ inputData }) => {
    const result = heuristicClassifyMail(inputData);
    return { original: inputData, result };
  }
});
