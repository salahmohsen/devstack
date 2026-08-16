import { z } from "zod";

import { contactTypeSchema } from "@tsu-stack/core";

/**
 * Relaxed AI structured-output schema for resume extract.
 * Normalize fills clientIds, years, and selected/included defaults.
 */
export const ResumeExtractContactSchema = z.object({
  type: contactTypeSchema.describe("Contact kind, e.g. email, linkedin, github, phone"),
  value: z.string().describe("Contact value as written on the resume")
});

export const ResumeExtractExperienceSchema = z.object({
  /** Optional temp id so projects can reference this experience. */
  clientId: z.string().optional().nullable().describe("Temp id so projects can link to this role"),
  title: z.string().describe("Role title, e.g. Senior Frontend Engineer"),
  organization: z.string().describe("Employer / org name"),
  description: z.string().optional().nullable().describe("Role bullets/body as prose"),
  fromDate: z.string().nullable().optional().describe("Start date ISO or year-month text"),
  toDate: z.string().nullable().optional().describe("End date, or null if current"),
  isPresent: z.boolean().optional().describe("true if this is the current role")
});

export const ResumeExtractProjectSchema = z.object({
  clientId: z.string().optional().nullable().describe("Temp id for this project"),
  title: z.string().describe("Project name"),
  year: z.number().int().optional().nullable().describe("Primary year, e.g. 2024"),
  summary: z.string().optional().nullable().describe("One-paragraph project summary"),
  description: z.string().optional().nullable().describe("Longer project write-up if present"),
  /** Reference to an experience clientId when linked. */
  experienceClientId: z
    .string()
    .nullable()
    .optional()
    .describe("clientId of the experience this project sat under"),
  /** 0-based index into the experiences array when nested under a job. */
  experienceIndex: z
    .number()
    .int()
    .optional()
    .nullable()
    .describe("0-based index into experiences when nested under a job"),
  stackNames: z.array(z.string()).optional().describe("Tech names used on this project"),
  /** Optional dates used only for year fallback during normalize. */
  fromDate: z.string().nullable().optional().describe("Start date used only for year fallback"),
  toDate: z.string().nullable().optional().describe("End date used only for year fallback")
});

export const ResumeExtractStackSchema = z.object({
  name: z.string().describe("Skill/tool display name, e.g. React"),
  description: z.string().nullable().optional().describe("One-line what they used it for"),
  type: z.string().nullable().optional().describe("Category if obvious, e.g. framework")
});

export const ResumeExtractProfileSchema = z.object({
  name: z.string().optional().nullable().describe("Full name from the resume header"),
  email: z.string().optional().nullable().describe("Primary email if present"),
  summary: z.string().optional().nullable().describe("Professional summary paragraph"),
  contacts: z.array(ResumeExtractContactSchema).optional().describe("Other contact lines")
});

export const ResumeExtractOutputSchema = z.object({
  profile: ResumeExtractProfileSchema.describe("Header / about section"),
  experiences: z.array(ResumeExtractExperienceSchema).default([]).describe("Work history roles"),
  projects: z.array(ResumeExtractProjectSchema).default([]).describe("Projects / portfolio items"),
  stacks: z.array(ResumeExtractStackSchema).default([]).describe("Skills mentioned on the resume"),
  warnings: z.array(z.string()).optional().describe("Extraction caveats, if any")
});

export type ResumeExtractOutput = z.infer<typeof ResumeExtractOutputSchema>;
