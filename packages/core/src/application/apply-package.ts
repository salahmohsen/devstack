import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";
import { ApplicationApplyMethodSchema, ApplicationSourceSchema } from "#@/application/types";

/** Job descriptions shorter than this (after trim) trigger listing page fetch. */
export const THIN_JD_DESCRIPTION_CHARS = 400;

/**
 * How much JD the preference scorer is allowed to see.
 * Must stay well above {@link THIN_JD_DESCRIPTION_CHARS} — 800 chars was a
 * teaser and made BYO score on a hydrated listing little better than cheap rank.
 */
export const SCORER_JOB_DESCRIPTION_CHARS = 4_000;

/**
 * Phrases that mark a harvest stub / paywall placeholder rather than a real JD.
 * Matched case-insensitively even when length is above {@link THIN_JD_DESCRIPTION_CHARS}.
 */
export const THIN_JD_STUB_MARKERS = [
  "sign-in wall",
  "signin wall",
  "sign in wall",
  "full posting details were unavailable",
  "posting details were unavailable",
  "speak to jack and jill",
  "get matched with roles or candidates",
  "jack & jill ai",
  "jack and jill ai",
  "log in to view the full",
  "login to view the full",
  "sign in to view the full",
  "sign in to continue"
] as const;

/**
 * True when description is missing, shorter than {@link THIN_JD_DESCRIPTION_CHARS},
 * or matches a known harvest/paywall stub marker.
 * Callers also require a fetchable listing/apply URL before fetching.
 */
export function isThinJobDescription(description: string | null | undefined): boolean {
  if (description == null) return true;
  const trimmed = description.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length < THIN_JD_DESCRIPTION_CHARS) return true;
  // SEO / og:description teasers end with an ellipsis even when they clear 400 chars.
  if (/(?:\.{3}|…)\s*$/u.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  return THIN_JD_STUB_MARKERS.some((marker) => lower.includes(marker));
}

const optionalNullableEmail = z
  .union([z.string().email(), z.literal(""), z.null()])
  .transform((value) => (value === "" ? null : value));

export const ApplyPackageJobContextSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  /** Description text used for generation (may include fetched page text). */
  descriptionUsed: z.string(),
  listingFetched: z.boolean(),
  listingUrl: z.string().nullable().optional()
});
export type ApplyPackageJobContext = z.infer<typeof ApplyPackageJobContextSchema>;

export const ApplyPackageExperienceDraftSchema = z.object({
  experienceId: z.string().min(1),
  include: z.boolean(),
  companyName: z.string().min(1),
  title: z.string().min(1),
  /** AI rewrite; grounded in portfolio evidence only. */
  rewrittenBullets: z.array(z.string())
});
export type ApplyPackageExperienceDraft = z.infer<typeof ApplyPackageExperienceDraftSchema>;

export const ApplyPackageProjectDraftSchema = z.object({
  projectId: z.string().min(1),
  include: z.boolean(),
  name: z.string().min(1),
  rewrittenSummary: z.string(),
  rewrittenBullets: z.array(z.string()).optional()
});
export type ApplyPackageProjectDraft = z.infer<typeof ApplyPackageProjectDraftSchema>;

export const ApplyPackageStackDraftSchema = z.object({
  stackId: z.string().min(1),
  include: z.boolean(),
  name: z.string().min(1)
});
export type ApplyPackageStackDraft = z.infer<typeof ApplyPackageStackDraftSchema>;

/**
 * Structured apply package draft persisted on `application.applyPackageDraft`.
 * Cleared on Accept (accepted fields live on dedicated columns).
 */
export const ApplyPackageDraftSchema = z.object({
  applicationId: z.string().min(1),
  generatedAt: z.string().min(1),
  jobContext: ApplyPackageJobContextSchema,
  proposedRecruiterEmail: optionalNullableEmail.nullable(),
  professionalSummary: z.string().nullable(),
  experiences: z.array(ApplyPackageExperienceDraftSchema),
  projects: z.array(ApplyPackageProjectDraftSchema),
  stacks: z.array(ApplyPackageStackDraftSchema),
  coverLetterBody: z.string(),
  outreachSubject: z.string(),
  outreachBody: z.string(),
  /** AI rationale for the human reviewer. */
  notes: z.string().optional()
});
export type ApplyPackageDraft = z.infer<typeof ApplyPackageDraftSchema>;

/** Portfolio snapshot sent into the Mastra apply-package workflow. */
export const ApplyPackagePortfolioSnapshotSchema = z.object({
  profile: z.object({
    name: z.string(),
    email: z.string().optional(),
    summary: z.string().nullable().optional()
  }),
  contacts: z
    .array(
      z.object({
        type: z.string(),
        value: z.string()
      })
    )
    .default([]),
  experiences: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      organization: z.string(),
      description: z.string(),
      fromDate: z.string().nullable().optional(),
      toDate: z.string().nullable().optional(),
      isPresent: z.boolean().optional()
    })
  ),
  projects: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      summary: z.string(),
      description: z.string(),
      /** Private project analysis when present — signal only for AI. */
      analysis: z.string().nullable().optional(),
      year: z.number().int().optional()
    })
  ),
  stacks: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string()
    })
  )
});
export type ApplyPackagePortfolioSnapshot = z.infer<typeof ApplyPackagePortfolioSnapshotSchema>;

/**
 * Shared API ↔ agent payload for `apply-package-workflow`.
 * Server builds this after preflight + optional thin-JD page fetch.
 */
export const ApplyPackageWorkflowInputSchema = z.object({
  applicationId: z.string().min(1),
  job: z.object({
    title: z.string().min(1),
    companyName: z.string().min(1),
    description: z.string().nullable(),
    url: z.string().nullable().optional(),
    applyUrl: z.string().nullable().optional(),
    applyMethod: ApplicationApplyMethodSchema.optional(),
    matchScore: z.number().int().min(0).max(100).nullable().optional(),
    location: z.string().nullable().optional(),
    salaryRange: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    source: ApplicationSourceSchema.nullable().optional()
  }),
  /** Server-fetched listing page text when JD was thin. */
  listingPageText: z.string().nullable().optional(),
  listingUrl: z.string().nullable().optional(),
  portfolio: ApplyPackagePortfolioSnapshotSchema,
  /** Server-resolved BYO model + key. Never log `llm.apiKey`. */
  llm: RuntimeLlmConfigSchema.optional()
});
export type ApplyPackageWorkflowInput = z.infer<typeof ApplyPackageWorkflowInputSchema>;

export const GenerateApplyPackageInputSchema = z.object({
  applicationId: z.string().min(1).describe("Tracked application id to draft a package for")
});
export type GenerateApplyPackageInput = z.infer<typeof GenerateApplyPackageInputSchema>;

/**
 * Accept materializes PDFs + accepted fields.
 * Prefer client-edited `draft`; server falls back to stored draft when omitted.
 */
export const AcceptApplyPackageInputSchema = z.object({
  applicationId: z.string().min(1).describe("Application id whose draft should become PDFs"),
  draft: ApplyPackageDraftSchema.optional().describe(
    "Optional client-edited draft; omit to use the stored draft"
  )
});
export type AcceptApplyPackageInput = z.infer<typeof AcceptApplyPackageInputSchema>;

export const SendOutreachInputSchema = z.object({
  applicationId: z.string().min(1).describe("Application id to send first-apply outreach for")
});
export type SendOutreachInput = z.infer<typeof SendOutreachInputSchema>;

/** Max portfolio experiences/projects per rewrite LLM step. */
export const APPLY_PACKAGE_REWRITE_CHUNK_SIZE = 3 as const;

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size) as T[]);
  }
  return out;
}

/**
 * Intermediate LLM output for one experience rewrite chunk.
 * Models often emit a bare array; coerce to `{ items }` so structured-output
 * validation still succeeds (Mastra validates with Zod before returning).
 */
export const ApplyPackageExperienceRewriteItemSchema = z.object({
  experienceId: z.string().min(1).describe("Existing experience id from the portfolio snapshot"),
  rewrittenBullets: z
    .array(z.string())
    .describe("3–6 JD-aligned bullets; keep facts, do not invent employers")
});
export const ApplyPackageExperienceRewriteChunkSchema = z.preprocess(
  (val) => (Array.isArray(val) ? { items: val } : val),
  z.object({
    items: z.array(ApplyPackageExperienceRewriteItemSchema)
  })
);
export type ApplyPackageExperienceRewriteChunk = z.infer<
  typeof ApplyPackageExperienceRewriteChunkSchema
>;

/**
 * Intermediate LLM output for one project rewrite chunk.
 * Same bare-array coercion as experience chunks.
 */
export const ApplyPackageProjectRewriteItemSchema = z.object({
  projectId: z.string().min(1).describe("Existing project id from the portfolio snapshot"),
  rewrittenSummary: z.string().describe("One tight paragraph tailored to the JD"),
  rewrittenBullets: z
    .array(z.string())
    .optional()
    .describe("Optional extra bullets for the project")
});
export const ApplyPackageProjectRewriteChunkSchema = z.preprocess(
  (val) => (Array.isArray(val) ? { items: val } : val),
  z.object({
    items: z.array(ApplyPackageProjectRewriteItemSchema)
  })
);
export type ApplyPackageProjectRewriteChunk = z.infer<typeof ApplyPackageProjectRewriteChunkSchema>;

/** Intermediate LLM output for summary + cover letter + outreach. */
export const ApplyPackageSummaryAndLettersSchema = z.object({
  professionalSummary: z
    .string()
    .nullable()
    .describe("Resume summary tailored to this JD, or null if none"),
  coverLetterBody: z.string().describe("Full cover letter body, no greeting/sign-off extras"),
  outreachSubject: z.string().describe("Short email subject for first-apply outreach"),
  outreachBody: z.string().describe("Plain-text outreach email body"),
  proposedRecruiterEmail: optionalNullableEmail
    .nullable()
    .describe("Recruiter email only if present in the JD; otherwise null"),
  notes: z.string().optional().describe("Internal note for the seeker, not sent")
});
export type ApplyPackageSummaryAndLetters = z.infer<typeof ApplyPackageSummaryAndLettersSchema>;

export type AssembleApplyPackageDraftInput = {
  applicationId: string;
  jobContext: ApplyPackageJobContext;
  portfolio: ApplyPackagePortfolioSnapshot;
  experienceRewrites: Array<{ experienceId: string; rewrittenBullets: string[] }>;
  projectRewrites: Array<{
    projectId: string;
    rewrittenSummary: string;
    rewrittenBullets?: string[];
  }>;
  letters: ApplyPackageSummaryAndLetters;
  generatedAt?: string;
};

/**
 * Merge multi-step rewrite + letter outputs into a public {@link ApplyPackageDraft}.
 * Experiences/projects follow portfolio snapshot order; all items default to include: true.
 * Throws if any portfolio experience/project lacks a matching rewrite.
 */
export function assembleApplyPackageDraft(
  input: AssembleApplyPackageDraftInput
): ApplyPackageDraft {
  const expMap = new Map(input.experienceRewrites.map((r) => [r.experienceId, r] as const));
  const projMap = new Map(input.projectRewrites.map((r) => [r.projectId, r] as const));

  const experiences = input.portfolio.experiences.map((e) => {
    const rewrite = expMap.get(e.id);
    if (!rewrite) {
      throw new Error(`missing rewrite for experience ${e.id}`);
    }
    return {
      experienceId: e.id,
      include: true as const,
      companyName: e.organization,
      title: e.title,
      rewrittenBullets: rewrite.rewrittenBullets
    };
  });

  const projects = input.portfolio.projects.map((p) => {
    const rewrite = projMap.get(p.id);
    if (!rewrite) {
      throw new Error(`missing rewrite for project ${p.id}`);
    }
    return {
      projectId: p.id,
      include: true as const,
      name: p.title,
      rewrittenSummary: rewrite.rewrittenSummary,
      ...(rewrite.rewrittenBullets ? { rewrittenBullets: rewrite.rewrittenBullets } : {})
    };
  });

  const stacks = input.portfolio.stacks.map((s) => {
    return {
      stackId: s.id,
      include: true as const,
      name: s.name
    };
  });

  const generatedAtTrimmed = input.generatedAt?.trim();
  const draft = {
    applicationId: input.applicationId,
    generatedAt:
      generatedAtTrimmed === undefined || generatedAtTrimmed.length === 0
        ? new Date().toISOString()
        : generatedAtTrimmed,
    jobContext: input.jobContext,
    proposedRecruiterEmail: input.letters.proposedRecruiterEmail ?? null,
    professionalSummary: input.letters.professionalSummary,
    experiences,
    projects,
    stacks,
    coverLetterBody: input.letters.coverLetterBody,
    outreachSubject: input.letters.outreachSubject,
    outreachBody: input.letters.outreachBody,
    ...(input.letters.notes != null ? { notes: input.letters.notes } : {})
  };

  const parsed = ApplyPackageDraftSchema.safeParse(draft);
  if (!parsed.success) {
    throw new Error(`apply_package_assemble_failed: ${parsed.error.message.slice(0, 200)}`);
  }
  return parsed.data;
}
