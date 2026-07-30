import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";

/**
 * Input for the organize-stacks workflow.
 * Takes all existing stacks and lets the workflow clean them up.
 */
export const OrganizeStacksInputSchema = z.object({
  stacks: z
    .array(
      z.object({
        id: z.string().describe("Stack ID"),
        name: z.string().describe("Current display name"),
        type: z.string().nullable().describe("Stack type category"),
        description: z.string().nullable().describe("Current description"),
        icon: z.string().nullable().describe("SVG icon string or null"),
        projectCount: z.number().int().describe("Number of projects using this stack")
      })
    )
    .describe("All existing stacks from the database"),
  /** Server-resolved BYO model + key. Never log `llm.apiKey`. */
  llm: RuntimeLlmConfigSchema.optional()
});

/**
 * One action the workflow recommends.
 */
export const OrganizeActionSchema = z.object({
  type: z.enum(["merge", "rename", "enrich"]).describe("Type of action to perform"),
  stackId: z.string().describe("Target stack ID"),
  stackName: z.string().describe("Target stack name (for display)"),
  details: z
    .object({
      // For merge: which stack to merge into
      mergeIntoId: z.string().optional().describe("Survivor stack ID for merge"),
      mergeIntoName: z.string().optional().describe("Survivor stack name for merge"),
      // For rename: new name
      newName: z.string().optional().describe("Proposed new name"),
      // For enrich: new metadata
      newDescription: z.string().optional().describe("Enriched description"),
      newIcon: z.string().optional().describe("SVG icon string"),
      newType: z.string().optional().describe("Corrected type category")
    })
    .describe("Action-specific details"),
  reason: z.string().describe("Human-readable reason for this action")
});

export type OrganizeAction = z.infer<typeof OrganizeActionSchema>;

/**
 * Output from the organize-stacks workflow.
 */
export const OrganizeStacksOutputSchema = z.object({
  actions: z.array(OrganizeActionSchema).describe("Recommended actions to organize stacks"),
  sortOrder: z.array(z.string()).describe("Stack IDs ordered by importance (most important first)"),
  summary: z
    .object({
      merges: z.number().int().describe("Number of merge actions"),
      renames: z.number().int().describe("Number of rename actions"),
      enrichments: z.number().int().describe("Number of enrichment actions"),
      sorted: z.boolean().describe("Whether stacks were re-sorted by importance")
    })
    .describe("Summary of recommended actions")
});

export type OrganizeStacksInput = z.infer<typeof OrganizeStacksInputSchema>;
export type OrganizeStacksOutput = z.infer<typeof OrganizeStacksOutputSchema>;
