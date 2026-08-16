import { z } from "zod";

import {
  ApplicationApplyMethodSchema,
  ApplicationSourceSchema,
  EmploymentTypeSchema
} from "#@/application/types";
import { WorkModeSchema } from "#@/job-preference/types";

export const ProposeApplicationFromJdInputSchema = z.object({
  title: z.string().min(1).max(300),
  companyName: z.string().min(1).max(200),
  description: z.string().min(1).max(50_000),
  url: z.string().url().optional().nullable(),
  listingUrl: z.string().url().optional().nullable(),
  applyUrl: z.string().url().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  salaryRange: z.string().max(200).optional().nullable(),
  applyMethod: ApplicationApplyMethodSchema.optional().nullable(),
  workMode: WorkModeSchema.optional().nullable(),
  employmentType: EmploymentTypeSchema.optional().nullable(),
  department: z.string().max(80).optional().nullable(),
  datePosted: z.string().max(40).optional().nullable(),
  experience: z.string().max(80).optional().nullable(),
  source: ApplicationSourceSchema.optional().nullable(),
  matchScore: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  agentTake: z.string().max(2000).optional().nullable(),
  requiredSkills: z.array(z.string().min(1).max(80)).max(24).optional().default([]),
  preferredSkills: z.array(z.string().min(1).max(80)).max(24).optional().default([])
});
export type ProposeApplicationFromJdInput = z.infer<typeof ProposeApplicationFromJdInputSchema>;

export const ProposeApplicationFromJdOutputSchema = z.object({
  action: z.enum(["package", "save", "dismiss"]),
  /** Set when the hub UI already created the CRM row (skip a second create). */
  applicationId: z.string().min(1).optional(),
  edits: z
    .object({
      title: z.string().optional(),
      companyName: z.string().optional(),
      url: z.string().optional()
    })
    .optional()
});
export type ProposeApplicationFromJdOutput = z.infer<typeof ProposeApplicationFromJdOutputSchema>;
