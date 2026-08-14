import { z } from "zod";

export const ProposeNewJobsTriageRowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(300),
  companyName: z.string().min(1).max(200),
  matchScore: z.number().min(0).max(100).optional().nullable(),
  reason: z.string().max(500).optional().nullable()
});
export type ProposeNewJobsTriageRow = z.infer<typeof ProposeNewJobsTriageRowSchema>;

export const ProposeNewJobsTriageInputSchema = z.object({
  track: z.array(ProposeNewJobsTriageRowSchema).max(20).default([]),
  dismiss: z.array(ProposeNewJobsTriageRowSchema).max(20).default([])
});
export type ProposeNewJobsTriageInput = z.infer<typeof ProposeNewJobsTriageInputSchema>;

export const ProposeNewJobsTriageOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  trackIds: z.array(z.string()).default([]),
  dismissIds: z.array(z.string()).default([])
});
export type ProposeNewJobsTriageOutput = z.infer<typeof ProposeNewJobsTriageOutputSchema>;
