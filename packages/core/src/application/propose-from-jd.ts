import { z } from "zod";

import {
  ApplicationApplyMethodSchema,
  ApplicationSourceSchema,
  EmploymentTypeSchema
} from "#@/application/types";
import { WorkModeSchema } from "#@/job-preference/types";

export const ProposeApplicationFromJdInputSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(300)
    .describe("Job title from the listing, e.g. Senior Frontend Engineer"),
  companyName: z
    .string()
    .min(1)
    .max(200)
    .describe("Employer name as written on the posting, never Unknown if the page has one"),
  description: z
    .string()
    .max(50_000)
    .describe("Full JD body — every section. Empty string only if extract failed or login wall"),
  url: z.string().url().optional().nullable().describe("Canonical listing URL the user pasted"),
  listingUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .describe("Alias for url when the extractor used listingUrl"),
  applyUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .describe("External ATS/apply URL if present; null for Easy Apply only"),
  location: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .describe("Location text from the posting, or null"),
  salaryRange: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .describe("Pay range only if the posting states it; never invent"),
  applyMethod: ApplicationApplyMethodSchema.optional()
    .nullable()
    .describe("easy_apply | external | email | unknown"),
  workMode: WorkModeSchema.optional()
    .nullable()
    .describe("remote | hybrid | onsite only if stated; otherwise null"),
  employmentType: EmploymentTypeSchema.optional()
    .nullable()
    .describe("full_time | part_time | contract | internship | unknown"),
  department: z.string().max(80).optional().nullable().describe("Team/department if stated"),
  datePosted: z.string().max(40).optional().nullable().describe("Posted date text if present"),
  experience: z
    .string()
    .max(80)
    .optional()
    .nullable()
    .describe("Seniority/years required if stated"),
  source: ApplicationSourceSchema.optional()
    .nullable()
    .describe("linkedin | indeed | company_website | referral | recruiter | other"),
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable()
    .describe("0–100 fit vs the seeker profile; use a number, not a string"),
  notes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .describe("1–3 sentence agent's take vs the seeker"),
  agentTake: z.string().max(2000).optional().nullable().describe("Alias for notes"),
  requiredSkills: z
    .array(z.string().min(1).max(80))
    .max(24)
    .optional()
    .default([])
    .describe("Must-have skills from Requirements / stack"),
  preferredSkills: z
    .array(z.string().min(1).max(80))
    .max(24)
    .optional()
    .default([])
    .describe("Nice-to-have skills only")
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
