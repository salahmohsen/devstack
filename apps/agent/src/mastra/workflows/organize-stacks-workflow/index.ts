import { createWorkflow } from "@mastra/core/workflows";

import { OrganizeStacksInputSchema, OrganizeStacksOutputSchema } from "@tsu-stack/core";

import { fetchMissingIcons } from "#@/mastra/workflows/organize-stacks-workflow/fetch-missing-icons.step";
import { findEnrichments } from "#@/mastra/workflows/organize-stacks-workflow/find-enrichments.step";
import { findMerges } from "#@/mastra/workflows/organize-stacks-workflow/find-merges.step";
import { findRenames } from "#@/mastra/workflows/organize-stacks-workflow/find-renames.step";
import { formatOutput } from "#@/mastra/workflows/organize-stacks-workflow/format-output.step";
import { sortStacks } from "#@/mastra/workflows/organize-stacks-workflow/sort-stacks.step";

export const organizeStacksWorkflow = createWorkflow({
  id: "organize-stacks-workflow",
  inputSchema: OrganizeStacksInputSchema,
  outputSchema: OrganizeStacksOutputSchema
})
  .then(findMerges)
  .then(findRenames)
  .then(findEnrichments)
  .then(fetchMissingIcons)
  .then(sortStacks)
  .then(formatOutput);

organizeStacksWorkflow.commit();
