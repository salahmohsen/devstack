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
  /** Models emit "2024" or "2023-24" as often as 2024 — normalize coerces. */
  year: z
    .union([z.number().int(), z.string()])
    .optional()
    .nullable()
    .describe("Primary year, e.g. 2024"),
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

const ResumeExtractStackObjectSchema = z.object({
  name: z.string().describe("Skill/tool display name, e.g. React"),
  description: z.string().nullable().optional().describe("One-line what they used it for"),
  type: z.string().nullable().optional().describe("Category if obvious, e.g. framework")
});

/**
 * Models often emit bare skill strings despite an object schema.
 * Coerce `"React"` → `{ name: "React" }` so structured-output validation succeeds.
 */
export const ResumeExtractStackSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return { name: val };
  }
  return val;
}, ResumeExtractStackObjectSchema);

export const ResumeExtractProfileSchema = z.object({
  name: z.string().optional().nullable().describe("Full name from the resume header"),
  email: z.string().optional().nullable().describe("Primary email if present"),
  summary: z.string().optional().nullable().describe("Professional summary paragraph"),
  contacts: z.array(ResumeExtractContactSchema).optional().describe("Other contact lines")
});

export const ResumeExtractEducationSchema = z.object({
  clientId: z.string().optional().nullable().describe("Temp id for this education row"),
  school: z.string().describe("Institution name"),
  degree: z
    .string()
    .describe(
      "Full degree name, e.g. Bachelor of Science — spell out, abbreviation may be added in parentheses"
    ),
  field: z.string().nullable().optional().describe("Field / major, e.g. Computer Science"),
  location: z.string().nullable().optional().describe("Campus / city, country if stated"),
  fromDate: z.string().nullable().optional().describe("Start, ISO or year-month text"),
  toDate: z.string().nullable().optional().describe("End, or null if still enrolled"),
  isPresent: z.boolean().default(false).describe("true if still enrolled"),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Honors, relevant coursework, thesis — keep verbatim"),
  gpa: z.string().nullable().optional().describe("GPA only if stated, verbatim format e.g. 3.8/4.0")
});

export const ResumeExtractCertificationSchema = z.object({
  clientId: z.string().optional().nullable().describe("Temp id for this certification"),
  name: z
    .string()
    .describe("Full official credential name verbatim, acronym may follow in parentheses"),
  issuer: z
    .string()
    .nullable()
    .optional()
    .describe("Issuing organization full name, or null when the resume does not say"),
  issuedAt: z.string().nullable().optional().describe("Issue date ISO or year-month"),
  expiresAt: z.string().nullable().default(null).describe("Expiry date, or null if none"),
  credentialUrl: z.string().nullable().optional().describe("Verification / credential URL"),
  description: z.string().nullable().optional().describe("Extra detail verbatim if present")
});

export const ResumeExtractOutputSchema = z.object({
  profile: ResumeExtractProfileSchema.describe("Header / about section"),
  experiences: z.array(ResumeExtractExperienceSchema).default([]).describe("Work history roles"),
  projects: z.array(ResumeExtractProjectSchema).default([]).describe("Projects / portfolio items"),
  stacks: z
    .array(ResumeExtractStackSchema)
    .default([])
    .describe("Skills as objects with name (string entries are coerced)"),
  educations: z
    .array(ResumeExtractEducationSchema)
    .default([])
    .describe("Education history — degrees with school, field, dates, honors, GPA"),
  certifications: z
    .array(ResumeExtractCertificationSchema)
    .default([])
    .describe("Certifications / licenses with issuer and dates"),
  warnings: z.array(z.string()).optional().describe("Extraction caveats, if any")
});

export type ResumeExtractOutput = z.infer<typeof ResumeExtractOutputSchema>;
