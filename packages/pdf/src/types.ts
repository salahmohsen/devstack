export type PdfContact = {
  type: string;
  value: string;
  /** User-defined display order from contact.sortOrder. */
  sortOrder?: number;
};

export type ResumePdfPortfolio = {
  experiences: Array<{
    organization: string;
    title: string;
    fromDate: string | null;
    toDate: string | null;
    isPresent: boolean;
    description: string;
    includedInPortfolio: boolean;
    /**
     * Optional pre-rewritten bullets (e.g. apply package).
     * When set and non-empty, used instead of parsing `description` HTML.
     */
    bullets?: string[];
  }>;
  projects: Array<{
    title: string;
    summary: string | null;
    /** Public live demo / project site. Never GitHub repos (including private). */
    demoUrl?: string | null;
    /** Full project description (HTML); preferred over summary for body bullets. */
    description?: string | null;
    /**
     * Stack entities linked to the project.
     * Resume rendering uses `name` only (never npm dependency package names)
     * and only when the stack is portfolio-included.
     */
    stacks: Array<{
      name: string;
      type?: string | null;
      includedInPortfolio?: boolean;
      sortOrder?: number;
    }>;
    includedInPortfolio: boolean;
    isArchived: boolean;
    /** Optional rewritten bullets for apply-package tailored resumes. */
    bullets?: string[];
  }>;
  stacks: Array<{
    name: string;
    /** Skill category from stack.type (ui, tooling, state management, …). */
    type?: string | null;
    includedInPortfolio: boolean;
    sortOrder?: number;
  }>;
  contacts: PdfContact[];
};

export type ResumePdfProfile = {
  name: string;
  email: string;
};

/**
 * Resume PDF input. Mapper uses trimmed-non-empty `professionalSummary`, else `summary`.
 */
export type ResumePdfInput = {
  portfolio: ResumePdfPortfolio;
  profile: ResumePdfProfile;
  /** Profile / user.summary (HTML allowed; mapper stripHtml). */
  summary: string;
  /** Optional tailored professional summary (apply package Accept). */
  professionalSummary?: string | null;
};

export type CoverLetterPdfInput = {
  candidateName: string;
  body: string;
  companyName?: string | null;
  roleTitle?: string | null;
  /** Defaults to now. */
  date?: Date;
  contacts: PdfContact[];
  email: string;
};
