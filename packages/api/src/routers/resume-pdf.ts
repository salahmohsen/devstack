import { buildDocumentPDFBytes, type DocumentBlock, type DocumentParams } from "pdfnative";

import {
  formatStackTypeLabel,
  normalizeStackType,
  STACK_TYPE_ORDER,
  stripUrl
} from "@tsu-stack/core";

import { applyPdfHeadingWeights, loadPdfALatinFontEntries } from "#@/lib/pdf/pdfa-latin-font";

// Re-export for callers/tests that import from this module.
export { formatStackTypeLabel } from "@tsu-stack/core";

export type ResumeBuilderData = {
  portfolio: {
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
    contacts: Array<{
      type: string;
      value: string;
      /** User-defined display order from contact.sortOrder. */
      sortOrder?: number;
    }>;
  };
  profile: {
    name: string;
    email: string;
  };
  /** Optional tailored professional summary (apply package Accept). */
  professionalSummary?: string | null;
};

const SPACING = {
  nameToContact: 6,
  contactToFirstSection: 12,
  itemMarginBottom: 10,
  skillCategoryMarginBottom: 3,
  sectionGap: 4,
  stackLabelToNames: 1
} as const;

const COLORS = {
  primary: "#111111",
  secondary: "#555555",
  muted: "#6B6B6B",
  link: "#1E4FA3"
} as const;

/** A4 + footer used by pdfnative (keep-with-next pre-pagination). */
const PDF_PAGE = {
  width: 595.28,
  height: 841.89,
  footerH: 15
} as const;

const HEADING_SIZES = { 1: 18, 2: 14, 3: 11 } as const;
const HEADING_SPACING = {
  1: { top: 14, bottom: 10 },
  2: { top: 10, bottom: 8 },
  3: { top: 8, bottom: 6 }
} as const;

/**
 * Role-based type scale. Headings render SemiBold (600); body/meta stay Regular (400).
 * Sizes descend with level; weight separates titles from reading text.
 */
const TYPE = {
  name: { kind: "heading", level: 1 as const },
  section: { kind: "heading", level: 2 as const },
  role: { kind: "heading", level: 3 as const },
  meta: { kind: "paragraph", fontSize: 9, color: COLORS.secondary },
  body: { kind: "paragraph", fontSize: 9, lineHeight: 1.35 },
  list: { kind: "list", fontSize: 9 },
  label: { kind: "paragraph", fontSize: 8, color: COLORS.muted }
} as const;

function headingBlock(
  text: string,
  role: keyof Pick<typeof TYPE, "name" | "section" | "role">
): DocumentBlock {
  return { type: "heading", text, level: TYPE[role].level };
}

function paragraphBlock(
  text: string,
  role: keyof Pick<typeof TYPE, "meta" | "body" | "label">
): DocumentBlock {
  const spec = TYPE[role];
  return {
    type: "paragraph",
    text,
    fontSize: spec.fontSize,
    ...("color" in spec ? { color: spec.color } : {}),
    ...("lineHeight" in spec ? { lineHeight: spec.lineHeight } : {})
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Prefer list items; else split multi-paragraph HTML into bullet-sized chunks.
 * Avoid dumping a wall of prose as a single bullet (bad for ATS + humans).
 */
export function extractBullets(html: string): string[] {
  const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  const items: string[] = [];
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]!).replace(/\s+/g, " ").trim();
    if (text) items.push(text);
  }
  if (items.length > 0) return items;

  const plain = stripHtml(html);
  if (!plain) return [];

  // Split on blank lines or sentence-ish boundaries when very long.
  const paragraphs = plain
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length > 1) return paragraphs;

  // Single long paragraph → keep as one bullet (still better than multi-line wrap noise).
  return [paragraphs[0]!];
}

/** Human-readable contact label for the PDF (no scheme, no www). */
export function displayContact(type: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (type === "email" || type === "phone" || type === "location") return v;

  // Bare handles → host/path so ATS parsers and humans still see the network.
  if (type === "github" && !v.includes(".") && !v.includes("/")) {
    return `github.com/${v.replace(/^@/, "")}`;
  }
  if (type === "linkedin" && !v.includes("linkedin.") && !/^https?:/i.test(v)) {
    const path = v.replace(/^@/, "").replace(/^in\//, "");
    return `linkedin.com/in/${path}`;
  }
  if (type === "x" && !v.includes("x.com") && !v.includes("twitter.") && !/^https?:/i.test(v)) {
    return `x.com/${v.replace(/^@/, "")}`;
  }

  return stripUrl(v);
}

/**
 * Build a pdfnative-safe href for a contact.
 * pdfnative only allows http:, https:, mailto: (not tel:).
 */
export function contactHref(type: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  if (type === "email") {
    const addr = v.replace(/^mailto:/i, "");
    return addr.includes("@") ? `mailto:${addr}` : null;
  }

  if (type === "phone" || type === "location") return null;

  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;

  if (type === "linkedin") {
    if (v.includes("linkedin.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://www.linkedin.com/in/${v.replace(/^@/, "").replace(/^in\//, "")}`;
  }
  if (type === "github") {
    if (v.includes("github.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://github.com/${v.replace(/^@/, "")}`;
  }
  if (type === "x") {
    if (v.includes("x.com") || v.includes("twitter.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://x.com/${v.replace(/^@/, "")}`;
  }
  if (type === "youtube") {
    if (v.includes("youtube.com") || v.includes("youtu.be")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://www.youtube.com/@${v.replace(/^@/, "")}`;
  }
  if (type === "instagram") {
    if (v.includes("instagram.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://www.instagram.com/${v.replace(/^@/, "")}`;
  }
  if (type === "telegram") {
    if (v.includes("t.me") || v.includes("telegram.")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://t.me/${v.replace(/^@/, "")}`;
  }
  if (type === "bluesky") {
    if (v.includes("bsky.app")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://bsky.app/profile/${v.replace(/^@/, "")}`;
  }
  if (type === "mastodon") {
    if (v.startsWith("http")) return v;
    const m = v.match(/^@?([^@]+)@([^@]+)$/);
    if (m) return `https://${m[2]}/@${m[1]}`;
    return v.includes(".") ? `https://${v.replace(/^\/\//, "")}` : null;
  }
  if (type === "discord") {
    if (v.startsWith("http")) return v;
    if (v.includes("discord.gg") || v.includes("discord.com")) {
      return `https://${v.replace(/^\/\//, "")}`;
    }
    return null;
  }

  if (v.includes(".") || v.includes("/")) {
    return `https://${v.replace(/^\/\//, "")}`;
  }
  return null;
}

/**
 * ATS-friendly contact display: keep email/phone/location as-is; for web links
 * prefer a compact host/path (parsers still pick up emails and domains).
 */
export function contactLineText(type: string, value: string): string {
  return displayContact(type, value);
}

/** Parse calendar dates without UTC day-shift (e.g. `2024-01-01` → Jan 2024). */
export function formatResumeMonthYear(raw: string | null): string {
  if (!raw?.trim()) return "";
  const m = raw.trim().match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    if (year > 0 && monthIndex >= 0 && monthIndex <= 11) {
      return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
      });
    }
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatDateRange(from: string | null, to: string | null, isPresent: boolean): string {
  const fromStr = formatResumeMonthYear(from);
  const toStr = isPresent ? "Present" : formatResumeMonthYear(to);
  if (!fromStr && !toStr) return "";
  return `${fromStr} - ${toStr}`;
}

/**
 * Group skills by `type` for the resume Skills section.
 * Unknown/null types land in "other". Order follows core {@link STACK_TYPE_ORDER}.
 */
export function groupStacksByType(
  stacks: Array<{ name: string; type?: string | null; sortOrder?: number }>
): Array<{ type: string; label: string; names: string[] }> {
  const map = new Map<string, Array<{ name: string; sortOrder: number; idx: number }>>();
  stacks.forEach((s, idx) => {
    const key = normalizeStackType(s.type);
    const list = map.get(key) ?? [];
    if (list.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) return;
    list.push({
      name: s.name,
      sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : Number.MAX_SAFE_INTEGER,
      idx
    });
    map.set(key, list);
  });

  const ordered: Array<{ type: string; label: string; names: string[] }> = [];
  const seen = new Set<string>();

  const namesFor = (type: string) => {
    const list = map.get(type);
    if (!list?.length) return [];
    return [...list]
      .toSorted((a, b) => a.sortOrder - b.sortOrder || a.idx - b.idx)
      .map((x) => x.name);
  };

  for (const type of STACK_TYPE_ORDER) {
    const names = namesFor(type);
    if (names.length === 0) continue;
    ordered.push({ type, label: formatStackTypeLabel(type), names });
    seen.add(type);
  }

  for (const type of map.keys()) {
    if (seen.has(type)) continue;
    const names = namesFor(type);
    if (names.length === 0) continue;
    ordered.push({ type, label: formatStackTypeLabel(type), names });
  }

  return ordered;
}

/**
 * Stack names for a project card on the resume.
 *
 * - Uses stack entity `name` only (never npm dependency package names).
 * - No type filter, deny-list, or cap — portfolio inclusion is the gate.
 * - Caller should pass only portfolio-included stacks.
 * - Order: sortOrder ascending, then first-seen name.
 */
export function projectStackNames(stacks: Array<{ name: string; sortOrder?: number }>): string[] {
  if (stacks.length === 0) return [];

  const sorted = [...stacks].toSorted((a, b) => {
    const ao = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return 0;
  });

  const names: string[] = [];
  const seen = new Set<string>();
  for (const s of sorted) {
    const name = s.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/**
 * Keep project stacks that are portfolio-included.
 * Prefers each stack's `includedInPortfolio` flag; falls back to membership
 * in the resume Skills set (portfolio stacks).
 */
export function filterPortfolioProjectStacks(
  projectStacks: Array<{
    name: string;
    type?: string | null;
    includedInPortfolio?: boolean;
    sortOrder?: number;
  }>,
  portfolioStacks: Array<{ name: string; includedInPortfolio: boolean }>
): Array<{ name: string; type?: string | null; sortOrder?: number }> {
  const portfolioNames = new Set(
    portfolioStacks
      .filter((s) => s.includedInPortfolio)
      .map((s) => s.name.trim().toLowerCase())
      .filter(Boolean)
  );

  return projectStacks.filter((s) => {
    if (s.includedInPortfolio === true) return true;
    if (s.includedInPortfolio === false) return false;
    return portfolioNames.has(s.name.trim().toLowerCase());
  });
}

/**
 * One horizontal contact line (ATS + layout).
 *
 * Order follows each contact's `sortOrder` (portfolio order). Type-rank is only
 * a tiebreaker when sortOrder is missing.
 *
 * pdfnative LinkBlock is block-level only — cannot place multiple hrefs on one
 * visual line. For ATS compatibility we put parseable text (email, phone, URLs)
 * in a single paragraph; readers still extract them from the text stream.
 */
export function buildContactLine(
  contacts: ResumeBuilderData["portfolio"]["contacts"],
  profileEmail: string
): string | null {
  const list = [...contacts];
  const hasEmail = list.some((c) => c.type === "email");
  if (!hasEmail && profileEmail.trim()) {
    list.unshift({ type: "email", value: profileEmail.trim(), sortOrder: -1 });
  }

  const typeOrder = [
    "location",
    "phone",
    "email",
    "website",
    "linkedin",
    "github",
    "x",
    "youtube",
    "instagram",
    "telegram",
    "bluesky",
    "mastodon",
    "discord"
  ];
  const typeRank = (t: string) => {
    const i = typeOrder.indexOf(t);
    return i === -1 ? 100 : i;
  };

  list.sort((a, b) => {
    const ao = a.sortOrder;
    const bo = b.sortOrder;
    const aHas = typeof ao === "number" && Number.isFinite(ao);
    const bHas = typeof bo === "number" && Number.isFinite(bo);
    if (aHas && bHas && ao !== bo) return ao! - bo!;
    if (aHas !== bHas) return aHas ? -1 : 1;
    return typeRank(a.type) - typeRank(b.type);
  });

  const parts = list
    .map((c) => contactLineText(c.type, c.value))
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;
  // Pipe is more ATS-safe for splitting than mid-dots.
  return parts.join(" | ");
}

/**
 * Approximate block height so we can insert page breaks before orphan headings.
 * Tuned to pdfnative's heading/list/paragraph spacing (Helvetica-ish avg width).
 */
function estimateLines(text: string, maxWidth: number, fontSize: number): number {
  if (!text) return 1;
  const avgChar = fontSize * 0.48;
  const charsPerLine = Math.max(8, Math.floor(maxWidth / avgChar));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  let lines = 1;
  let col = 0;
  for (const w of words) {
    const need = (col === 0 ? 0 : 1) + w.length;
    if (col + need > charsPerLine && col > 0) {
      lines += 1;
      col = w.length;
    } else {
      col += need;
    }
  }
  return lines;
}

function estimateBlockHeight(block: DocumentBlock, contentWidth: number): number {
  switch (block.type) {
    case "heading": {
      const sz = HEADING_SIZES[block.level];
      const spacing = HEADING_SPACING[block.level];
      const lines = estimateLines(block.text, contentWidth, sz);
      return spacing.top + lines * (sz * 1.3) + spacing.bottom;
    }
    case "paragraph": {
      const sz = block.fontSize ?? 10;
      const lh = block.lineHeight ?? 1.4;
      const indent = block.indent ?? 0;
      const lines = estimateLines(block.text, contentWidth - indent, sz);
      return lines * (sz * lh) + 4;
    }
    case "list": {
      const sz = block.fontSize ?? 10;
      const lineH = sz * 1.4;
      let acc = 0;
      for (const entry of block.items) {
        const text = typeof entry === "string" ? entry : entry.text;
        const lines = estimateLines(text, contentWidth - 24, sz);
        acc += lineH + (lines - 1) * lineH + 2;
      }
      return acc;
    }
    case "spacer":
      return block.height;
    case "pageBreak":
      return Number.POSITIVE_INFINITY;
    case "link": {
      const sz = block.fontSize ?? 10;
      return estimateLines(block.text, contentWidth, sz) * (sz * 1.4) + 4;
    }
    case "barcode":
    case "chart":
    case "formField":
    case "image":
    case "svg":
    case "table":
    case "toc":
      return 16;
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

/**
 * Insert pageBreak before H2/H3 when the heading would sit alone at the bottom
 * of a page (pdfnative has no keep-with-next). Keeps title + following body
 * together when they fit on one page.
 */
export function preventOrphanHeadings(
  blocks: DocumentBlock[],
  margins: { t: number; r: number; b: number; l: number }
): DocumentBlock[] {
  const contentW = PDF_PAGE.width - margins.l - margins.r;
  const availableH = PDF_PAGE.height - margins.t - margins.b - PDF_PAGE.footerH;

  /** Minimum body height that must follow an H3 on the same page. */
  const KEEP_AFTER_H3 = 78;
  /** Minimum body height after a section H2. */
  const KEEP_AFTER_H2 = 52;

  let remain = availableH;
  const out: DocumentBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;

    if (block.type === "pageBreak") {
      out.push(block);
      remain = availableH;
      continue;
    }

    const blockH = estimateBlockHeight(block, contentW);

    if (block.type === "heading" && (block.level === 2 || block.level === 3)) {
      const minBody = block.level === 3 ? KEEP_AFTER_H3 : KEEP_AFTER_H2;
      let keep = blockH;
      for (let j = i + 1; j < blocks.length; j++) {
        const next = blocks[j]!;
        if (next.type === "pageBreak") break;
        // H2 sections must keep at least the first item H3 + body; H3 stops at next heading.
        if (next.type === "heading") {
          if (block.level === 3) break;
          // Include first child H3, then keep scanning its body.
          if (next.level === 3) {
            keep += estimateBlockHeight(next, contentW);
            continue;
          }
          break;
        }
        // Stop at the item gap spacer — body for this card ends there.
        if (next.type === "spacer" && next.height >= SPACING.itemMarginBottom) {
          if (block.level === 2 && keep < blockH + minBody) continue;
          break;
        }
        keep += estimateBlockHeight(next, contentW);
        if (keep >= blockH + minBody) break;
      }
      const need = Math.min(keep, availableH);
      if (need > remain && out.length > 0) {
        out.push({ type: "pageBreak" as const });
        remain = availableH;
      }
    } else if (blockH > remain && out.length > 0) {
      // Mirror pdfnative: block alone does not fit → force page break so remain stays accurate.
      out.push({ type: "pageBreak" as const });
      remain = availableH;
    }

    out.push(block);
    remain -= blockH;
    if (remain < 0) remain = 0;
  }

  return out;
}

export function buildResumeDocument(data: ResumeBuilderData): {
  params: DocumentParams;
  layout: {
    tagged: "pdfa2u";
    margins: { t: number; r: number; b: number; l: number };
  };
} {
  const experiences = data.portfolio.experiences.filter((e) => e.includedInPortfolio);
  const projects = data.portfolio.projects.filter((p) => p.includedInPortfolio && !p.isArchived);
  const stacks = data.portfolio.stacks.filter((s) => s.includedInPortfolio);

  const blocks: DocumentBlock[] = [];

  blocks.push(headingBlock(data.profile.name, "name"));
  blocks.push({ type: "spacer" as const, height: SPACING.nameToContact });

  const contactLine = buildContactLine(data.portfolio.contacts, data.profile.email);
  if (contactLine) {
    blocks.push(paragraphBlock(contactLine, "meta"));
  }

  blocks.push({ type: "spacer" as const, height: SPACING.contactToFirstSection });

  const professionalSummary = data.professionalSummary?.trim();
  if (professionalSummary) {
    blocks.push(headingBlock("SUMMARY", "section"));
    blocks.push(paragraphBlock(professionalSummary, "body"));
    blocks.push({ type: "spacer" as const, height: SPACING.itemMarginBottom });
  }

  if (experiences.length > 0) {
    blocks.push(headingBlock("EXPERIENCE", "section"));
    for (const exp of experiences) {
      // ATS-friendly order: Title, then company + dates on one line.
      blocks.push(headingBlock(exp.title, "role"));
      const dates = formatDateRange(exp.fromDate, exp.toDate, exp.isPresent);
      const meta = [exp.organization, dates].filter(Boolean).join(" | ");
      if (meta) {
        blocks.push(paragraphBlock(meta, "meta"));
      }
      const rewritten = (exp.bullets ?? []).map((b) => b.trim()).filter(Boolean);
      const bullets = rewritten.length > 0 ? rewritten : extractBullets(exp.description);
      if (bullets.length > 0) {
        blocks.push({
          type: "list" as const,
          items: bullets,
          style: "bullet" as const,
          fontSize: TYPE.list.fontSize
        });
      }
      blocks.push({ type: "spacer" as const, height: SPACING.itemMarginBottom });
    }
  }

  if (projects.length > 0) {
    blocks.push(headingBlock("PROJECTS", "section"));
    for (const proj of projects) {
      blocks.push(headingBlock(proj.title, "role"));

      // Prefer rewritten bullets → description bullets → summary paragraph.
      const rewritten = (proj.bullets ?? []).map((b) => b.trim()).filter(Boolean);
      const fromDescription =
        rewritten.length === 0 && proj.description?.trim() ? extractBullets(proj.description) : [];
      const bullets = rewritten.length > 0 ? rewritten : fromDescription;

      if (bullets.length > 0) {
        blocks.push({
          type: "list" as const,
          items: bullets,
          style: "bullet" as const,
          fontSize: TYPE.list.fontSize
        });
      } else if (proj.summary?.trim()) {
        blocks.push(paragraphBlock(stripHtml(proj.summary), "body"));
      }

      // Portfolio-included stack entity names only (no npm package / deny / cap).
      const techNames = projectStackNames(filterPortfolioProjectStacks(proj.stacks ?? [], stacks));
      if (techNames.length > 0) {
        blocks.push(paragraphBlock("Stack", "label"));
        blocks.push({
          type: "spacer" as const,
          height: SPACING.stackLabelToNames
        });
        blocks.push(paragraphBlock(techNames.join(" · "), "meta"));
      }
      blocks.push({ type: "spacer" as const, height: SPACING.itemMarginBottom });
    }
  }

  if (stacks.length > 0) {
    blocks.push(headingBlock("SKILLS", "section"));
    const groups = groupStacksByType(stacks);
    for (const group of groups) {
      blocks.push(paragraphBlock(`${group.label}: ${group.names.join(", ")}`, "body"));
      blocks.push({ type: "spacer" as const, height: SPACING.skillCategoryMarginBottom });
    }
  }

  const margins = { t: 48, r: 48, b: 48, l: 48 } as const;
  // pdfnative draws `params.title` as a blue page-0 header — redundant with H1 name.
  // Keep author/subject for /Info; omit title so only the document H1 appears.
  const finalBlocks = preventOrphanHeadings(blocks, margins);

  return {
    params: {
      metadata: {
        author: data.profile.name,
        subject: `${data.profile.name} — Resume`,
        keywords: "resume, cv"
      },
      blocks: finalBlocks
    },
    // PDF/A-2u + tagged structure: best pdfnative target for ATS/text extraction.
    layout: { tagged: "pdfa2u", margins }
  };
}

/** Generate resume PDF bytes with embedded Noto Sans (strict PDF/A-2u). */
export async function renderResumePdfBytes(data: ResumeBuilderData): Promise<Uint8Array> {
  const { params, layout } = buildResumeDocument(data);
  const fontEntries = await loadPdfALatinFontEntries();
  return buildDocumentPDFBytes(
    { ...params, fontEntries, blocks: applyPdfHeadingWeights(params.blocks) },
    layout
  );
}
