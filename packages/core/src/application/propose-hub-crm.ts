import { z } from "zod";

import { ApplicationOutcomeSchema, UpdateApplicationInputSchema } from "#@/application/types";
import { analysisKeyInPatch } from "#@/evidence/propose";

export const HubCrmConfirmActionSchema = z.enum(["confirm", "cancel"]);

export const ProposeApplicationFieldChangeInputSchema = z
  .object({
    applicationId: z.string().min(1),
    currentMarkdown: z.string(),
    proposedMarkdown: z.string().min(1),
    patch: z.record(z.string(), z.unknown()).default({})
  })
  .superRefine((value, ctx) => {
    const badKey = analysisKeyInPatch(value.patch);
    if (badKey) {
      ctx.addIssue({
        code: "custom",
        path: ["patch", badKey],
        message: "analysis is form-only; omit it from hub patches"
      });
    }
    const parsed = UpdateApplicationInputSchema.safeParse(value.patch);
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        path: ["patch"],
        message: "patch must be editable CRM fields (not kit JSON)"
      });
    }
  });
export type ProposeApplicationFieldChangeInput = z.infer<
  typeof ProposeApplicationFieldChangeInputSchema
>;

export const ProposeApplicationFieldChangeOutputSchema = z.object({
  action: HubCrmConfirmActionSchema,
  applicationId: z.string().min(1)
});
export type ProposeApplicationFieldChangeOutput = z.infer<
  typeof ProposeApplicationFieldChangeOutputSchema
>;

export const ProposeSetOutcomeInputSchema = z.object({
  applicationId: z.string().min(1),
  outcome: ApplicationOutcomeSchema,
  companyName: z.string().max(200).optional(),
  title: z.string().max(300).optional()
});
export type ProposeSetOutcomeInput = z.infer<typeof ProposeSetOutcomeInputSchema>;

export const ProposeSetOutcomeOutputSchema = z.object({
  action: HubCrmConfirmActionSchema,
  applicationId: z.string().min(1)
});
export type ProposeSetOutcomeOutput = z.infer<typeof ProposeSetOutcomeOutputSchema>;

export const ProposeDeleteApplicationInputSchema = z.object({
  applicationId: z.string().min(1),
  companyName: z.string().max(200).optional(),
  title: z.string().max(300).optional()
});
export type ProposeDeleteApplicationInput = z.infer<typeof ProposeDeleteApplicationInputSchema>;

export const ProposeDeleteApplicationOutputSchema = z.object({
  action: HubCrmConfirmActionSchema,
  applicationId: z.string().min(1)
});
export type ProposeDeleteApplicationOutput = z.infer<typeof ProposeDeleteApplicationOutputSchema>;

export const ProposeDeleteNoteInputSchema = z.object({
  applicationId: z.string().min(1),
  noteId: z.string().min(1),
  kind: z.literal("note").default("note"),
  preview: z.string().max(400).optional()
});
export type ProposeDeleteNoteInput = z.infer<typeof ProposeDeleteNoteInputSchema>;

export const ProposeDeleteNoteOutputSchema = z.object({
  action: HubCrmConfirmActionSchema,
  noteId: z.string().min(1)
});
export type ProposeDeleteNoteOutput = z.infer<typeof ProposeDeleteNoteOutputSchema>;

export const HubBatchTrackingActionSchema = z.enum(["track", "dismiss", "restore"]);
export type HubBatchTrackingAction = z.infer<typeof HubBatchTrackingActionSchema>;

export const ProposeBatchTrackingChangeInputSchema = z.object({
  trackingAction: HubBatchTrackingActionSchema,
  ids: z.array(z.string().min(1)).min(1).max(40),
  labels: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().max(300).optional(),
        companyName: z.string().max(200).optional()
      })
    )
    .optional()
});
export type ProposeBatchTrackingChangeInput = z.infer<typeof ProposeBatchTrackingChangeInputSchema>;

export const ProposeBatchTrackingChangeOutputSchema = z.object({
  action: HubCrmConfirmActionSchema,
  trackingAction: HubBatchTrackingActionSchema,
  ids: z.array(z.string())
});
export type ProposeBatchTrackingChangeOutput = z.infer<
  typeof ProposeBatchTrackingChangeOutputSchema
>;

/**
 * One Confirm for generate-apply-package across many tracked jobs.
 * Client Confirm opens the AI island and runs generate per id (no per-id Approve).
 */
export const ProposeBatchGeneratePackagesInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(20),
  labels: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().max(300).optional(),
        companyName: z.string().max(200).optional()
      })
    )
    .optional()
});
export type ProposeBatchGeneratePackagesInput = z.infer<
  typeof ProposeBatchGeneratePackagesInputSchema
>;

export const ProposeBatchGeneratePackagesOutputSchema = z.object({
  action: HubCrmConfirmActionSchema,
  ids: z.array(z.string())
});
export type ProposeBatchGeneratePackagesOutput = z.infer<
  typeof ProposeBatchGeneratePackagesOutputSchema
>;

export const ProposeRefreshFromUrlInputSchema = z.object({
  applicationId: z.string().min(1),
  url: z.string().url().max(2_000),
  companyName: z.string().max(200).optional(),
  title: z.string().max(300).optional()
});
export type ProposeRefreshFromUrlInput = z.infer<typeof ProposeRefreshFromUrlInputSchema>;

export const ProposeRefreshFromUrlOutputSchema = z.object({
  action: HubCrmConfirmActionSchema,
  applicationId: z.string().min(1)
});
export type ProposeRefreshFromUrlOutput = z.infer<typeof ProposeRefreshFromUrlOutputSchema>;
