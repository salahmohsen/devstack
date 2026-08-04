import { z } from "zod";

import {
  ApplyPackageJobContextSchema,
  ApplyPackagePortfolioSnapshotSchema,
  ApplyPackageSummaryAndLettersSchema,
  RuntimeLlmConfigSchema
} from "@tsu-stack/core";

export const ApplyPackageJobBriefSchema = z.object({
  title: z.string(),
  companyName: z.string(),
  descriptionUsed: z.string(),
  location: z.string().nullable().optional(),
  salaryRange: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});
export type ApplyPackageJobBrief = z.infer<typeof ApplyPackageJobBriefSchema>;

export const ApplyPackageWorkflowStateSchema = z.object({
  applicationId: z.string(),
  jobContext: ApplyPackageJobContextSchema,
  jobBrief: ApplyPackageJobBriefSchema,
  portfolio: ApplyPackagePortfolioSnapshotSchema,
  llm: RuntimeLlmConfigSchema.optional(),
  experienceRewrites: z
    .array(z.object({ experienceId: z.string(), rewrittenBullets: z.array(z.string()) }))
    .default([]),
  projectRewrites: z
    .array(
      z.object({
        projectId: z.string(),
        rewrittenSummary: z.string(),
        rewrittenBullets: z.array(z.string()).optional()
      })
    )
    .default([]),
  letters: ApplyPackageSummaryAndLettersSchema.optional()
});
export type ApplyPackageWorkflowState = z.infer<typeof ApplyPackageWorkflowStateSchema>;
