import { z } from "zod";

import { OrganizeStacksInputSchema } from "@tsu-stack/core";

export const StackSchema = OrganizeStacksInputSchema.shape.stacks;

export const MergeActionSchema = z.object({
  victimId: z.string(),
  victimName: z.string(),
  survivorId: z.string(),
  survivorName: z.string(),
  reason: z.string()
});

export const RenameActionSchema = z.object({
  stackId: z.string(),
  currentName: z.string(),
  newName: z.string(),
  reason: z.string(),
  alternativeNames: z.array(z.string()).default([])
});

export const EnrichActionSchema = z.object({
  stackId: z.string(),
  stackName: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  type: z.string().nullable()
});
