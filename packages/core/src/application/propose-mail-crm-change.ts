import { z } from "zod";

import { ApplicationOutcomeSchema, ApplicationStageSchema } from "#@/application/types";

export const ProposeMailCrmIntentSchema = z.enum([
  "track_applied",
  "create_applied",
  "set_stage",
  "close_rejected"
]);
export type ProposeMailCrmIntent = z.infer<typeof ProposeMailCrmIntentSchema>;

export const ProposeMailCrmChangeInputSchema = z.object({
  companyName: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  listingUrl: z.string().max(2000).optional().nullable(),
  mailId: z.string().min(1),
  mailSubject: z.string().max(500).optional().nullable(),
  mailLabels: z.array(z.string()).default([]),
  applicationId: z.string().min(1).optional().nullable(),
  trackingStatus: z.enum(["inbox", "tracked", "dismissed", "none"]).optional().nullable(),
  currentStage: ApplicationStageSchema.optional().nullable(),
  currentOutcome: ApplicationOutcomeSchema.optional().nullable(),
  intent: ProposeMailCrmIntentSchema,
  targetStage: ApplicationStageSchema.optional().nullable(),
  reason: z.string().max(400).optional().nullable()
});
export type ProposeMailCrmChangeInput = z.infer<typeof ProposeMailCrmChangeInputSchema>;

export const ProposeMailCrmChangeOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  applicationId: z.string().optional().nullable()
});
export type ProposeMailCrmChangeOutput = z.infer<typeof ProposeMailCrmChangeOutputSchema>;
