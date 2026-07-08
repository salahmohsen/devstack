import { type DocumentBlock, type DocumentParams } from "pdfnative";

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
    }>;
    projects: Array<{
      title: string;
      summary: string | null;
      stacks: Array<{ name: string }>;
      includedInPortfolio: boolean;
      isArchived: boolean;
    }>;
    stacks: Array<{
      name: string;
      includedInPortfolio: boolean;
    }>;
    contacts: Array<{
      type: string;
      value: string;
    }>;
  };
  profile: {
    name: string;
    email: string;
  };
};

const SPACING = {
  pagePadding: 52,
  sectionMarginTop: 18,
  sectionMarginBottom: 18,
  headingMarginBottom: 8,
  bulletMarginBottom: 3,
  itemMarginBottom: 14,
  skillCategoryMarginBottom: 10,
  contactGap: 8,
  nameToContact: 10,
  contactToFirstSection: 18
} as const;

const COLORS = {
  primary: "#111111",
  secondary: "#555555",
  link: "#1E4FA3",
  bullet: "#111111"
} as const;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractBullets(html: string): string[] {
  const liRegex = /<li>(.*?)<\/li>/gs;
  const items: string[] = [];
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text) items.push(text);
  }
  if (items.length === 0) {
    const text = stripHtml(html);
    if (text) items.push(text);
  }
  return items;
}

function stripUrl(value: string): string {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "");
}

function displayContact(type: string, value: string): string {
  if (type === "email" || type === "phone" || type === "location") return value;
  return stripUrl(value);
}

type ContactMap = Record<string, string>;

function toContactMap(contacts: ResumeBuilderData["portfolio"]["contacts"]): ContactMap {
  const map: ContactMap = {};
  for (const c of contacts) {
    map[c.type] = displayContact(c.type, c.value);
  }
  return map;
}

function formatDateRange(from: string | null, to: string | null, isPresent: boolean): string {
  const fmt = (d: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };
  const fromStr = fmt(from);
  const toStr = isPresent ? "Present" : fmt(to);
  return `${fromStr} - ${toStr}`;
}

export function buildResumeDocument(data: ResumeBuilderData): {
  params: DocumentParams;
  layout: { tagged: true; margins: { t: number; r: number; b: number; l: number } };
} {
  const experiences = data.portfolio.experiences.filter((e) => e.includedInPortfolio);
  const projects = data.portfolio.projects.filter((p) => p.includedInPortfolio && !p.isArchived);
  const stacks = data.portfolio.stacks.filter((s) => s.includedInPortfolio);

  const blocks: DocumentBlock[] = [];

  blocks.push({ type: "heading" as const, text: data.profile.name, level: 1 as const });

  const contactMap = toContactMap(data.portfolio.contacts);
  const contactText = data.portfolio.contacts
    .filter((c) => contactMap[c.type])
    .map((c) => contactMap[c.type])
    .join(" · ");

  if (contactText) {
    blocks.push({
      type: "paragraph" as const,
      text: contactText,
      fontSize: 9,
      color: COLORS.secondary
    });
  }

  blocks.push({ type: "spacer" as const, height: SPACING.contactToFirstSection });

  if (experiences.length > 0) {
    blocks.push({ type: "heading" as const, text: "EXPERIENCE", level: 2 as const });
    for (const exp of experiences) {
      blocks.push({
        type: "heading" as const,
        text: `${exp.organization}, ${exp.title}`,
        level: 3 as const
      });
      blocks.push({
        type: "paragraph" as const,
        text: formatDateRange(exp.fromDate, exp.toDate, exp.isPresent),
        fontSize: 9,
        color: COLORS.secondary
      });
      const bullets = extractBullets(exp.description);
      if (bullets.length > 0) {
        blocks.push({
          type: "list" as const,
          items: bullets,
          style: "bullet" as const,
          fontSize: 9
        });
      }
      blocks.push({ type: "spacer" as const, height: SPACING.itemMarginBottom });
    }
  }

  if (projects.length > 0) {
    blocks.push({ type: "heading" as const, text: "PROJECTS", level: 2 as const });
    for (const proj of projects) {
      blocks.push({ type: "heading" as const, text: proj.title, level: 3 as const });
      if (proj.summary) {
        blocks.push({
          type: "paragraph" as const,
          text: stripHtml(proj.summary),
          fontSize: 9
        });
      }
      if (proj.stacks.length > 0) {
        blocks.push({
          type: "paragraph" as const,
          text: `Tech Stack: ${proj.stacks.map((s) => s.name).join(" • ")}`,
          fontSize: 9
        });
      }
      blocks.push({ type: "spacer" as const, height: SPACING.itemMarginBottom });
    }
  }

  if (stacks.length > 0) {
    blocks.push({ type: "heading" as const, text: "SKILLS", level: 2 as const });
    blocks.push({
      type: "paragraph" as const,
      text: stacks.map((s) => s.name).join(", "),
      fontSize: 9
    });
  }

  return {
    params: { blocks },
    layout: { tagged: true, margins: { t: 52, r: 52, b: 52, l: 52 } }
  };
}
