import { z } from "zod";

import { contactTypeSchema } from "@tsu-stack/core";

/**
 * Relaxed AI structured-output schema for resume extract.
 * Normalize fills clientIds, years, and selected/included defaults.
 */
export const ResumeExtractContactSchema = z.object({
  type: contactTypeSchema,
  value: z.string()
});

export const ResumeExtractExperienceSchema = z.object({
  /** Optional temp id so projects can reference this experience. */
  clientId: z.string().optional().nullable(),
  title: z.string(),
  organization: z.string(),
  description: z.string().optional().nullable(),
  fromDate: z.string().nullable().optional(),
  toDate: z.string().nullable().optional(),
  isPresent: z.boolean().optional()
});

export const ResumeExtractProjectSchema = z.object({
  clientId: z.string().optional().nullable(),
  title: z.string(),
  year: z.number().int().optional().nullable(),
  summary: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  /** Reference to an experience clientId when linked. */
  experienceClientId: z.string().nullable().optional(),
  /** 0-based index into the experiences array when nested under a job. */
  experienceIndex: z.number().int().optional().nullable(),
  stackNames: z.array(z.string()).optional(),
  /** Optional dates used only for year fallback during normalize. */
  fromDate: z.string().nullable().optional(),
  toDate: z.string().nullable().optional()
});

export const ResumeExtractStackSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional()
});

export const ResumeExtractProfileSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  contacts: z.array(ResumeExtractContactSchema).optional()
});

export const ResumeExtractOutputSchema = z.object({
  profile: ResumeExtractProfileSchema,
  experiences: z.array(ResumeExtractExperienceSchema).default([]),
  projects: z.array(ResumeExtractProjectSchema).default([]),
  stacks: z.array(ResumeExtractStackSchema).default([]),
  warnings: z.array(z.string()).optional()
});

export type ResumeExtractOutput = z.infer<typeof ResumeExtractOutputSchema>;
