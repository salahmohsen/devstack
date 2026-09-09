import { type ResumeImportDraft } from "@tsu-stack/core";
import { buildRenderCvDoc, type ResumePdfInput, type ResumePdfPortfolio } from "@tsu-stack/pdf/doc";

/**
 * Map the confirmed onboarding draft onto the exact input the PDF pipeline
 * consumes, so the doc preview mirrors the real renderer:
 * - experiences / projects / stacks are on the resume when selected AND
 *   portfolio-included (same gate as `syncPortfolioDefaultResume`);
 * - educations / certifications are include-when-present (selected rows).
 */
export function draftToResumePdfInput(draft: ResumeImportDraft): ResumePdfInput {
  const portfolio: ResumePdfPortfolio = {
    experiences: draft.experiences
      .filter((exp) => exp.selected && exp.includedInPortfolio)
      .map((exp) => {
        return {
          organization: exp.organization,
          title: exp.title,
          fromDate: exp.fromDate ?? null,
          toDate: exp.toDate ?? null,
          isPresent: Boolean(exp.isPresent),
          description: exp.description,
          includedInPortfolio: true
        };
      }),
    educations: draft.educations
      .filter((edu) => edu.selected)
      .map((edu) => {
        return {
          school: edu.school,
          degree: edu.degree,
          field: edu.field ?? null,
          location: edu.location ?? null,
          fromDate: edu.fromDate ?? null,
          toDate: edu.toDate ?? null,
          isPresent: Boolean(edu.isPresent),
          description: edu.description ?? null,
          gpa: edu.gpa ?? null
        };
      }),
    certifications: draft.certifications
      .filter((cert) => cert.selected)
      .map((cert) => {
        return {
          name: cert.name,
          issuer: cert.issuer,
          issuedAt: cert.issuedAt ?? null,
          expiresAt: cert.expiresAt ?? null,
          credentialUrl: cert.credentialUrl ?? null,
          description: cert.description ?? null
        };
      }),
    projects: draft.projects
      .filter((project) => project.selected && project.includedInPortfolio)
      .map((project) => {
        return {
          title: project.title,
          summary: project.summary || null,
          demoUrl: null,
          description: project.description || null,
          stacks: project.stackNames.map((name) => {
            // Featured-only: the pipeline drops project stacks that are not
            // portfolio-included in the master stacks list.
            const stack = draft.stacks.find((s) => s.name === name);
            return {
              name,
              includedInPortfolio: Boolean(stack?.selected && stack?.includedInPortfolio)
            };
          }),
          includedInPortfolio: true,
          isArchived: false
        };
      }),
    stacks: draft.stacks
      .filter((stack) => stack.selected && stack.includedInPortfolio)
      .map((stack, index) => {
        return {
          name: stack.name,
          type: stack.type ?? null,
          includedInPortfolio: true,
          sortOrder: index
        };
      }),
    contacts: (draft.profile.contacts ?? []).map((contact) => {
      return { type: contact.type, value: contact.value };
    })
  };

  return {
    profile: {
      name: draft.profile.name.trim() || "Resume",
      email: draft.profile.email ?? ""
    },
    summary: draft.profile.summary ?? "",
    portfolio
  };
}

export type ExperienceEntry = {
  company?: string;
  position?: string;
  start_date?: string;
  end_date?: string;
  highlights?: string[];
};

export type EducationEntry = {
  institution?: string;
  studyType?: string;
  area?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  highlights?: string[];
};

export type ProjectEntry = {
  name?: string;
  /** Rewritten summary paragraph — rides the zip from `projectRows`, not the cv record. */
  summary?: string;
  highlights?: string[];
};

export type SkillEntry = {
  label?: string;
  details?: string;
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asStringOrList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return asStringArray(value);
}

export type DocPreviewSectionId =
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications";

type WithClientId = { clientId: string };

export type DocPreviewSection = {
  id: DocPreviewSectionId;
  label: string;
  /** Section has confirmed content — renders on the real resume too. */
  present: boolean;
  count: number;
  summary?: string;
  experience?: Array<ExperienceEntry & WithClientId>;
  education?: Array<EducationEntry & WithClientId>;
  projects?: Array<ProjectEntry & WithClientId>;
  skills?: SkillEntry[];
  certifications?: Array<{
    clientId?: string;
    text: string;
    rest: string;
    linkUrl?: string;
  }>;
};

/** Renderer section order: summary → experience → education → projects → skills → certifications. */
const SECTION_ORDER: Array<{ id: DocPreviewSectionId; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "certifications", label: "Certifications" }
];

export type DocPreviewModel = {
  name: string;
  headline: string | null;
  /** engineeringresumes connection line: location, email, phone, website, socials. */
  contactLine: Array<{ text: string; link: boolean }>;
  sections: DocPreviewSection[];
};

/**
 * Build the doc-preview model from the confirmed draft. The draft→pdf-input
 * mapping stays here; the cv→model conversion is shared via
 * `docPreviewModelFromRenderCvDoc`. Section presence and order come from
 * `buildRenderCvDoc` — the exact mapping the PDF pipeline uses — so the
 * preview never lies about the artifact. Rendered entries are zipped with
 * their source draft rows (same filter, same order) so the paper can bind
 * click-to-edit fields back to `clientId`.
 */
export function buildDocPreviewModel(draft: ResumeImportDraft): DocPreviewModel {
  const input = draftToResumePdfInput(draft);
  const cv = asRecord(buildRenderCvDoc(input));
  // Mirror the exact filters draftToResumePdfInput applied — index-aligned
  // with the rendered section entries.
  return docPreviewModelFromRenderCvDoc(cv, {
    experienceRows: draft.experiences.filter((exp) => exp.selected && exp.includedInPortfolio),
    educationRows: draft.educations.filter((edu) => edu.selected),
    certificationRows: draft.certifications.filter((cert) => cert.selected),
    projectRows: draft.projects.filter((project) => project.selected && project.includedInPortfolio)
  });
}

export type SectionRowMaps = {
  experienceRows: Array<{ clientId: string }>;
  educationRows: Array<{ clientId: string }>;
  certificationRows: Array<{ clientId: string }>;
  /** Extra row fields (e.g. `summary`) ride along onto the zipped project entry. */
  projectRows: Array<{ clientId: string; summary?: string | null }>;
};

/**
 * cv→model conversion for the doc preview, shared by the onboarding preview
 * and the apply-package paper. Consumes `buildRenderCvDoc` output directly, so
 * it must stay in lockstep with the PDF mapper. `rows` must apply the same
 * filters as the pdf input did, index-aligned with the rendered section
 * entries.
 */
export function docPreviewModelFromRenderCvDoc(
  cv: Record<string, unknown>,
  rows: SectionRowMaps
): DocPreviewModel {
  const sectionsDoc = asRecord(cv.sections);

  const summaryList = asStringArray(sectionsDoc.summary);
  const experience = withClientIds(
    asRecordList<ExperienceEntry>(sectionsDoc.experience),
    rows.experienceRows
  );
  const education = withClientIds(
    asRecordList<EducationEntry>(sectionsDoc.education),
    rows.educationRows
  );
  // The cv record does not carry project summaries (map-rendercv-yaml folds
  // them into highlights only when no bullets exist) — pull the row summary
  // through the zip so the paper can bind the rewritten-summary field.
  const projects = withClientIds(
    asRecordList<ProjectEntry>(sectionsDoc.projects),
    rows.projectRows
  ).map((entry, index) => {
    const summary = rows.projectRows[index]?.summary?.trim();
    return summary ? { ...entry, summary } : entry;
  });
  const skills = asRecordList<SkillEntry>(sectionsDoc.skills);
  const certifications = asStringArray(sectionsDoc.certifications).map((line, index) => {
    // Pipeline emits markdown links for credentialed certs: `[Name](url) — Issuer, date`.
    const match = /^\[([^\]]+)\]\(([^)\s]+)\)\s*([\s\S]*)$/.exec(line);
    const row = rows.certificationRows[index];
    return {
      clientId: row?.clientId,
      text: match ? match[1] : line,
      rest: match ? match[3] : "",
      linkUrl: match?.[2]
    };
  });

  const counts: Record<DocPreviewSectionId, number> = {
    summary: summaryList.length,
    experience: experience.length,
    education: education.length,
    projects: projects.length,
    skills: skills.length,
    certifications: certifications.length
  };

  const socials = Array.isArray(cv.social_networks)
    ? (cv.social_networks as Array<Record<string, unknown>>)
    : [];
  const socialDisplay = (network: unknown, username: unknown): string => {
    const net = typeof network === "string" ? network.toLowerCase() : "";
    const user = typeof username === "string" ? username : "";
    if (net === "github") return `github.com/${user}`;
    if (net === "linkedin") return `linkedin.com/in/${user}`;
    if (net === "x") return `x.com/${user}`;
    return user ? `${net}: ${user}` : "";
  };

  const contactLine = [
    ...(typeof cv.location === "string" && cv.location.trim()
      ? [{ text: cv.location.trim(), link: false }]
      : []),
    ...asStringOrList(cv.email).map((text) => {
      return { text, link: true };
    }),
    ...asStringOrList(cv.phone).map((text) => {
      return { text, link: true };
    }),
    ...asStringOrList(cv.website).map((text) => {
      return { text, link: true };
    }),
    ...socials
      .map((social) => socialDisplay(social.network, social.username))
      .filter(Boolean)
      .map((text) => {
        return { text, link: true };
      })
  ];

  const sections: DocPreviewSection[] = SECTION_ORDER.map(({ id, label }) => {
    return {
      id,
      label,
      present: counts[id] > 0,
      count: counts[id],
      ...(id === "summary" ? { summary: summaryList[0] } : {}),
      ...(id === "experience" ? { experience } : {}),
      ...(id === "education" ? { education } : {}),
      ...(id === "projects" ? { projects } : {}),
      ...(id === "skills" ? { skills } : {}),
      ...(id === "certifications" ? { certifications } : {})
    };
  });

  return {
    name: typeof cv.name === "string" && cv.name.trim() ? cv.name : "Your resume",
    headline: typeof cv.headline === "string" ? cv.headline : null,
    contactLine,
    sections
  };
}

function asRecordList<T extends Record<string, unknown> = Record<string, unknown>>(
  value: unknown
): T[] {
  return Array.isArray(value) ? value.map((entry) => asRecord(entry) as T) : [];
}

/** Zip rendered entries with their index-aligned source draft rows. */
function withClientIds<T extends Record<string, unknown>>(
  entries: T[],
  rows: Array<{ clientId: string }>
): Array<T & WithClientId> {
  return entries.map((entry, index) => {
    const clientId = rows[index]?.clientId;
    return clientId ? ({ ...entry, clientId } as T & WithClientId) : (entry as T & WithClientId);
  });
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Paper bullet write-back (locked: flat rewrite) — one plain `<p>` per line.
 * Round-trips through the pdf pipeline's bullet extraction: `</p>` becomes a
 * newline, so the same lines come back out. Empty line = bullet removed;
 * extra line = bullet added.
 */
export function bulletsToDescription(lines: string[]): string {
  const cleaned = lines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  return cleaned.map((line) => `<p>${escapeHtmlText(line)}</p>`).join("");
}

const RENDER_CV_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

/** RenderCV date rendering: `2024-01` → `Jan 2024`, `present` stays. */
function renderCvDisplayDate(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^present$/i.test(trimmed)) return "present";
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(trimmed);
  if (!match) return trimmed;
  const month = match[2] ? Number(match[2]) : null;
  if (month !== null && month >= 1 && month <= 12) {
    return `${RENDER_CV_MONTHS[month - 1]} ${match[1]}`;
  }
  return match[1];
}

/** Entry line for dates: `Jan 2024 – present` (en dash, RenderCV style). */
export function entryDateRange(start?: string | null, end?: string | null): string | null {
  const from = renderCvDisplayDate(start);
  const to = renderCvDisplayDate(end);
  if (!from && !to) return null;
  return [from, to].filter(Boolean).join(" – ");
}
