import { z } from "zod";

export const batchOutputSchema = z.array(
  z.object({
    npmPackage: z.string(),
    belongsToExistingStack: z.boolean(),
    existingStackName: z.string().nullable(),
    type: z.string().nullable(),
    displayName: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    description: z.string().nullable()
  })
);

export const categorizedEntrySchema = z.object({
  npmPackage: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  repo: z.string(),
  relatedPackages: z.array(z.string()),
  iconSvg: z.string().nullable(),
  stackId: z.null(),
  existingStackId: z.string().nullable()
});
