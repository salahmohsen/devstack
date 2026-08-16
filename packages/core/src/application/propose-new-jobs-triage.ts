import { z } from "zod";

export const ProposeNewJobsTriageRowSchema = z.object({
  id: z.string().min(1).describe("Real application id from listNewJobs"),
  title: z.string().min(1).max(300).describe("Job title as listed"),
  companyName: z.string().min(1).max(200).describe("Employer name as listed"),
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable()
    .describe("0–100 fit score from the list row when known"),
  reason: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .describe("One short sentence why track or dismiss")
});
export type ProposeNewJobsTriageRow = z.infer<typeof ProposeNewJobsTriageRowSchema>;

export const ProposeNewJobsTriageInputSchema = z.object({
  track: z
    .array(ProposeNewJobsTriageRowSchema)
    .max(20)
    .default([])
    .describe("Inbox jobs to keep / track after confirm"),
  dismiss: z
    .array(ProposeNewJobsTriageRowSchema)
    .max(20)
    .default([])
    .describe("Inbox jobs to hide after confirm")
});
export type ProposeNewJobsTriageInput = z.infer<typeof ProposeNewJobsTriageInputSchema>;

export const ProposeNewJobsTriageOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  trackIds: z.array(z.string()).default([]),
  dismissIds: z.array(z.string()).default([])
});
export type ProposeNewJobsTriageOutput = z.infer<typeof ProposeNewJobsTriageOutputSchema>;
