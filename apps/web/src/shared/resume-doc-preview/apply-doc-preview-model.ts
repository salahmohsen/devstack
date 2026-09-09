import { type ApplyPackageDraft } from "@tsu-stack/core";
import { buildRenderCvDoc, type ResumePdfInput, type ResumePdfPortfolio } from "@tsu-stack/pdf/doc";

import {
  asRecord,
  docPreviewModelFromRenderCvDoc,
  type DocPreviewModel
} from "@/shared/resume-doc-preview/doc-preview-model";

/**
 * Live identity rows the review dialog already fetches. Typed as structural
 * subsets of the orpc outputs (`experiences.list`, `projects.list`,
 * `stacks.list`, `contacts.list`, `educations.list`, `certifications.list`),
 * so Task 15 can pass the query results straight through.
 */
export type ApplyPackageLiveRows = {
  profile: { name: string; email: string; summary: string | null };
  contacts: Array<{
    type: string;
    value: string;
    sortOrder: number;
    includedInPortfolio: boolean;
  }>;
  experiences: Array<{
    id: string;
    title: string;
    organization: string;
    fromDate: string | null;
    toDate: string | null;
    isPresent: boolean;
    description: string;
    portfolioEntryId: string | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    summary: string;
    description: string;
    demoUrl: string | null;
    isArchived: boolean;
    portfolioEntryId: string | null;
    stacks: Array<{
      name: string;
      type: string | null;
      /** Gate mirrors accept-apply-package: `includedInPortfolio = !!portfolioEntryId`. */
      portfolioEntryId: string | null;
      sortOrder: number;
    }>;
  }>;
  stacks: Array<{ id: string; name: string; type: string | null; sortOrder: number }>;
  educations: Array<{
    school: string;
    degree: string;
    field: string | null;
    location: string | null;
    fromDate: string | null;
    toDate: string | null;
    isPresent: boolean;
    description: string | null;
    gpa: string | null;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issuedAt: string | null;
    expiresAt: string | null;
    credentialUrl: string | null;
    description: string | null;
  }>;
};

/** A draft row that actually renders on the tailored PDF (accept gates). */
export type KeptExperience = {
  draftRow: ApplyPackageDraft["experiences"][number];
  live: ApplyPackageLiveRows["experiences"][number];
};
export type KeptProject = {
  draftRow: ApplyPackageDraft["projects"][number];
  live: ApplyPackageLiveRows["projects"][number];
};

/**
 * One kept-rows derivation shared by the portfolio build, the section zip,
 * and the evidence map — an unfiltered zip would misalign when a row is
 * dropped for missing `portfolioEntryId` or archive state. Same gates as
 * accept-apply-package: experience/project rows must be `include`d AND carry
 * a live `portfolioEntryId`; archived projects never render. Order follows
 * the draft so the zip stays index-aligned with the rendered paper.
 */
export function keptApplyPackageRows(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): { experiences: KeptExperience[]; projects: KeptProject[] } {
  const expById = new Map(live.experiences.map((row) => [row.id, row] as const));
  const projectById = new Map(live.projects.map((row) => [row.id, row] as const));
  return {
    experiences: draft.experiences.flatMap((draftRow) => {
      const row = expById.get(draftRow.experienceId);
      if (!draftRow.include || !row || !row.portfolioEntryId) return [];
      return [{ draftRow, live: row }];
    }),
    projects: draft.projects.flatMap((draftRow) => {
      const row = projectById.get(draftRow.projectId);
      if (!draftRow.include || !row || !row.portfolioEntryId || row.isArchived) return [];
      return [{ draftRow, live: row }];
    })
  };
}

/**
 * Mirror accept-apply-package's portfolio construction (spec #3): the paper
 * must never show a section the PDF wouldn't render. Section presence =
 * include switches; identity (org/title/dates) from live rows; rewritten
 * text from the draft. `headline` is a top-level `ResumePdfInput` field (NOT
 * inside `profile` — `ResumePdfProfile` is `{ name, email }` only).
 */
export function applyPackageDraftToResumePdfInput(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): ResumePdfInput {
  const kept = keptApplyPackageRows(draft, live);
  const stackById = new Map(live.stacks.map((row) => [row.id, row] as const));

  const experiences: ResumePdfPortfolio["experiences"] = kept.experiences.map(
    ({ draftRow, live: row }) => {
      return {
        organization: row.organization,
        title: row.title,
        fromDate: row.fromDate,
        toDate: row.toDate,
        isPresent: row.isPresent,
        description: row.description,
        includedInPortfolio: true,
        bullets: draftRow.rewrittenBullets
      };
    }
  );

  const projects: ResumePdfPortfolio["projects"] = kept.projects.map(({ draftRow, live: row }) => {
    return {
      title: row.title,
      summary: draftRow.rewrittenSummary || row.summary,
      demoUrl: row.demoUrl,
      description: row.description,
      stacks: row.stacks.map((stack) => {
        return {
          name: stack.name,
          type: stack.type,
          includedInPortfolio: Boolean(stack.portfolioEntryId),
          sortOrder: stack.sortOrder
        };
      }),
      includedInPortfolio: true,
      isArchived: row.isArchived,
      bullets: draftRow.rewrittenBullets
    };
  });

  const stacks: ResumePdfPortfolio["stacks"] = draft.stacks
    .filter((s) => s.include)
    .map((s) => {
      const row = stackById.get(s.stackId);
      return {
        name: row?.name ?? s.name,
        type: row?.type ?? null,
        includedInPortfolio: true,
        sortOrder: row?.sortOrder
      };
    });

  const portfolio: ResumePdfPortfolio = {
    experiences,
    projects,
    stacks,
    contacts: live.contacts
      .filter((c) => c.includedInPortfolio)
      .map((c) => {
        return { type: c.type, value: c.value, sortOrder: c.sortOrder };
      }),
    educations: live.educations.map((edu) => {
      return {
        school: edu.school,
        degree: edu.degree,
        field: edu.field,
        location: edu.location,
        fromDate: edu.fromDate,
        toDate: edu.toDate,
        isPresent: edu.isPresent,
        description: edu.description,
        gpa: edu.gpa
      };
    }),
    certifications: live.certifications.map((cert) => {
      return {
        name: cert.name,
        issuer: cert.issuer,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        credentialUrl: cert.credentialUrl,
        description: cert.description
      };
    })
  };

  return {
    profile: {
      name: live.profile.name.trim() || "Candidate",
      email: live.profile.email
    },
    // Same chain as accept: pass the raw headline when its trim is non-empty;
    // the PDF mapper trims again and falls back to the latest experience title.
    headline: draft.headline.trim() ? draft.headline : undefined,
    summary: live.profile.summary ?? "",
    professionalSummary: draft.professionalSummary,
    portfolio
  };
}

export type ApplyPackageDocPreview = {
  model: DocPreviewModel;
  /** clientId → original live text; evidence icon renders only when present (spec #4). */
  evidenceByClientId: Record<string, string>;
};

/**
 * Tailored-paper preview for the review dialog's Resume pane. Builds the exact
 * `ResumePdfInput` accept would render, converts the RenderCV doc with the
 * shared onboarding twin, and zips the rendered entries with KEPT draft rows
 * (same filter, same order) so click-to-edit stays bound to the right source.
 */
export function buildApplyPackageDocPreview(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): ApplyPackageDocPreview {
  const kept = keptApplyPackageRows(draft, live);
  const input = applyPackageDraftToResumePdfInput(draft, live);
  const cv = asRecord(buildRenderCvDoc(input));
  const model = docPreviewModelFromRenderCvDoc(cv, {
    experienceRows: kept.experiences.map(({ draftRow }) => {
      return { clientId: draftRow.experienceId };
    }),
    educationRows: [],
    certificationRows: [],
    projectRows: kept.projects.map(({ draftRow }) => {
      return { clientId: draftRow.projectId };
    })
  });

  const evidenceByClientId: Record<string, string> = {};
  for (const { draftRow, live: row } of kept.experiences) {
    if (row.description) evidenceByClientId[draftRow.experienceId] = row.description;
  }
  for (const { draftRow, live: row } of kept.projects) {
    const text = [row.summary, row.description].filter(Boolean).join("\n");
    if (text) evidenceByClientId[draftRow.projectId] = text;
  }

  return { model, evidenceByClientId };
}
