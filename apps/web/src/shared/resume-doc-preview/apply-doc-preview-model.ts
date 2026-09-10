import { resolveApplyPackagePdfDraft, type ApplyPackageDraft } from "@tsu-stack/core";
import { buildRenderCvDoc, type ResumePdfInput, type ResumePdfPortfolio } from "@tsu-stack/pdf/doc";

import {
  asRecord,
  docPreviewModelFromRenderCvDoc,
  type DocPreviewModel,
  type DocPreviewSection
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
      /** Project `Stack:` lines are featured-only; Skills is not. */
      isFeatured: boolean;
      sortOrder: number;
    }>;
  }>;
  stacks: Array<{
    id: string;
    name: string;
    type: string | null;
    sortOrder: number;
    isFeatured: boolean;
  }>;
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

export type KeptApplyPackageRows = ReturnType<typeof keptApplyPackageRows>;

/**
 * One kept-rows derivation shared by the portfolio build, the section zip,
 * and the evidence map — an unfiltered zip would misalign when a row is
 * dropped for missing `portfolioEntryId` or archive state. Same gates as
 * accept-apply-package: experience/project rows must be `include`d AND carry
 * a live `portfolioEntryId`; archived projects never render. Order follows
 * the draft so the zip stays index-aligned with the rendered paper.
 *
 * Must be called with the **resolved** draft (`resolveApplyPackagePdfDraft`
 * applied) so page-budget hiding filters rows here too, exactly like accept.
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
 *
 * Takes the **resolved** draft (page-budget hiding already applied by
 * `resolveApplyPackagePdfDraft`) plus the single shared `kept` derivation, so
 * the portfolio, the section zip, and the evidence map all agree on the same
 * row set — no second derivation.
 */
export function applyPackageDraftToResumePdfInput(input: {
  resolvedDraft: ApplyPackageDraft;
  kept: KeptApplyPackageRows;
  live: ApplyPackageLiveRows;
}): ResumePdfInput {
  const { resolvedDraft, kept, live } = input;
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
          isFeatured: stack.isFeatured,
          sortOrder: stack.sortOrder
        };
      }),
      includedInPortfolio: true,
      isArchived: row.isArchived,
      bullets: draftRow.rewrittenBullets
    };
  });

  const stacks: ResumePdfPortfolio["stacks"] = resolvedDraft.stacks
    .filter((s) => s.include)
    .map((s) => {
      const row = stackById.get(s.stackId);
      return {
        name: row?.name ?? s.name,
        type: row?.type ?? null,
        includedInPortfolio: true,
        sortOrder: row?.sortOrder,
        isFeatured: Boolean(row?.isFeatured)
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
    headline: resolvedDraft.headline.trim() ? resolvedDraft.headline : undefined,
    summary: live.profile.summary ?? "",
    professionalSummary: resolvedDraft.professionalSummary,
    portfolio
  };
}

export type ApplyPackageDocPreviewOptions = {
  /** Review ON: resolver passthrough — human `include` flags win (spec #2). */
  reviewApplyKit: boolean;
  /** application.requiredSkills + preferredSkills — same feed accept ranks with. */
  jobSkills: ReadonlyArray<{ name: string }>;
};

export type ApplyPackageDocPreview = {
  model: DocPreviewModel;
  /** clientId → original live text; evidence icon renders only when present (spec #4). */
  evidenceByClientId: Record<string, string>;
  /** Resolver outcome (spec #3 parity) — ready for a "hidden to fit pages" hint. */
  hiddenExperienceCount: number;
  hiddenProjectCount: number;
  pageBudget: 1 | 2 | null;
};

/**
 * Excluded-item stubs for the paper (Variant A promise: "Flip its include
 * switch to add it"). Computed from the RAW draft + live maps, never the
 * resolved draft: budget-hidden rows had `include: true` pre-resolve (they
 * were force-hidden, not user-toggled), so saving them back as excluded
 * would be a lie. Only user-controlled `include: false` rows with a
 * kept-capable live row are toggleable — a row whose live row is missing
 * entirely has no switch to flip.
 */
function excludedExperienceStubs(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): NonNullable<DocPreviewSection["excluded"]> {
  const byId = new Map(live.experiences.map((row) => [row.id, row] as const));
  return draft.experiences.flatMap((draftRow) => {
    if (draftRow.include) return [];
    const row = byId.get(draftRow.experienceId);
    // Kept-capable gate = the same portfolioEntryId check accept applies.
    if (!row?.portfolioEntryId) return [];
    return [
      {
        clientId: draftRow.experienceId,
        label: [row.title, row.organization].filter(Boolean).join(", ") || "Role"
      }
    ];
  });
}

function excludedProjectStubs(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): NonNullable<DocPreviewSection["excluded"]> {
  const byId = new Map(live.projects.map((row) => [row.id, row] as const));
  return draft.projects.flatMap((draftRow) => {
    if (draftRow.include) return [];
    const row = byId.get(draftRow.projectId);
    // Archived projects never render even when re-included — not toggleable.
    if (!row?.portfolioEntryId || row.isArchived) return [];
    return [{ clientId: draftRow.projectId, label: row.title || "Project" }];
  });
}

/**
 * Tailored-paper preview for the review dialog's Resume pane. Mirrors accept
 * exactly: FIRST run `resolveApplyPackagePdfDraft` (review off → page-budget
 * hiding flips low-ranked `include` to false), THEN derive the paper, section
 * zip, and evidence map from that single resolved draft so the preview never
 * shows a row the PDF would drop.
 */
export function buildApplyPackageDocPreview(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows,
  options: ApplyPackageDocPreviewOptions
): ApplyPackageDocPreview {
  const resolved = resolveApplyPackagePdfDraft({
    draft,
    reviewApplyKit: options.reviewApplyKit,
    experiences: live.experiences.map((row) => {
      return {
        experienceId: row.id,
        rewrittenBullets: [],
        fromDate: row.fromDate ?? null,
        isPresent: row.isPresent ?? false
      };
    }),
    jobSkills: options.jobSkills
  });
  const resolvedDraft = resolved.draft;
  // Single kept-rows derivation on the resolved draft: include gates AND
  // budget hides both flow through here, then feed the paper and the zip.
  const kept = keptApplyPackageRows(resolvedDraft, live);
  const input = applyPackageDraftToResumePdfInput({ resolvedDraft, kept, live });
  const cv = asRecord(buildRenderCvDoc(input));
  const baseModel = docPreviewModelFromRenderCvDoc(cv, {
    experienceRows: kept.experiences.map(({ draftRow }) => {
      return { clientId: draftRow.experienceId };
    }),
    educationRows: [],
    certificationRows: [],
    projectRows: kept.projects.map(({ draftRow, live: row }) => {
      // Same effective-summary rule as the portfolio build: the paper's
      // editable summary field rides the zip, so rewritten text wins.
      return {
        clientId: draftRow.projectId,
        summary: draftRow.rewrittenSummary || row.summary
      };
    })
  });

  // Stub re-include affordances ride INSIDE the model sections (experience,
  // projects, skills) — the onboarding path never sets them, so its DOM is
  // untouched.
  const excludedExperiences = excludedExperienceStubs(draft, live);
  const excludedProjects = excludedProjectStubs(draft, live);
  const stackById = new Map(live.stacks.map((row) => [row.id, row] as const));
  const excludedSkills = draft.stacks.flatMap((draftRow) => {
    if (draftRow.include) return [];
    const row = stackById.get(draftRow.stackId);
    return row ? [row.name] : [];
  });

  const model: DocPreviewModel = {
    ...baseModel,
    sections: baseModel.sections.map((section) => {
      if (section.id === "experience") return { ...section, excluded: excludedExperiences };
      if (section.id === "projects") return { ...section, excluded: excludedProjects };
      if (section.id === "skills") return { ...section, excludedSkills };
      return section;
    })
  };

  const evidenceByClientId: Record<string, string> = {};
  for (const { draftRow, live: row } of kept.experiences) {
    if (row.description) evidenceByClientId[draftRow.experienceId] = row.description;
  }
  for (const { draftRow, live: row } of kept.projects) {
    const text = [row.summary, row.description].filter(Boolean).join("\n");
    if (text) evidenceByClientId[draftRow.projectId] = text;
  }

  return {
    model,
    evidenceByClientId,
    hiddenExperienceCount: resolved.hiddenExperienceCount,
    hiddenProjectCount: resolved.hiddenProjectCount,
    pageBudget: resolved.pageBudget
  };
}
