import { z } from "zod";

export const batchOutputSchema = z.array(
  z.object({
    npmPackage: z.string(),
    belongsToExistingStack: z.boolean(),
    existingStackName: z.string().nullable(),
    type: z.string().nullable(),
    displayName: z.string(),
    confidence: z.enum(["high", "medium", "low"])
    // description intentionally omitted — filled from npm registry in enrich-npm step
  })
);

export const npmHealthSchema = z
  .object({
    deprecated: z.boolean().optional(),
    downloads: z.number().optional(),
    lastPublished: z.string().optional()
  })
  .nullable();

export const categorizedEntrySchema = z.object({
  npmPackage: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  repo: z.string(),
  relatedPackages: z.array(z.string()),
  iconSvg: z.string().nullable(),
  stackId: z.string().nullable(),
  existingStackId: z.string().nullable(),
  health: npmHealthSchema.default(null)
});

/** Shared intermediate shape: matched deps + categorized new stacks. */
export const matchCategorizeSchema = z.object({
  matched: z.array(
    z.object({
      npmPackage: z.string(),
      stackId: z.string(),
      name: z.string(),
      repo: z.string(),
      relatedPackages: z.array(z.string())
    })
  ),
  categorized: z.array(categorizedEntrySchema)
});
