import { Document, Heading, Link, List, Page, Spacer, Text } from "pdfnative-react";

import { type PortfolioListOutput } from "@tsu-stack/core";

import { type GenerateResume } from "@/server/resume-service";

const SPACING = {
  pagePadding: 52,
  sectionMarginTop: 18,
  sectionMarginBottom: 18,
  headingMarginBottom: 8,
  jobMarginBottom: 10,
  bulletMarginBottom: 3,
  paragraphMarginBottom: 8,
  projectMarginBottom: 14,
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

function toContactMap(contacts: Pick<PortfolioListOutput, "contacts">["contacts"]): ContactMap {
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

function ContactLine({
  contacts
}: {
  contacts: Pick<PortfolioListOutput, "contacts">["contacts"];
}) {
  const contactMap = toContactMap(contacts);
  const entries = contacts.filter((c) => contactMap[c.type]);
  if (entries.length === 0) return null;

  return entries.map((c) => (
    <Text>
      <Link url={c.value} fontSize={9} color={COLORS.secondary}>
        {contactMap[c.type]}
      </Link>
    </Text>
  ));
}

export function ResumeDocument({ data }: { data: GenerateResume }) {
  const experiences = data.portfolio.experiences.filter((e) => e.includedInPortfolio);
  const projects = data.portfolio.projects.filter((p) => p.includedInPortfolio && !p.isArchived);
  const stacks = data.portfolio.stacks.filter((s) => s.includedInPortfolio);

  return (
    <Document
      layout={{
        tagged: true,
        margins: { t: 52, r: 52, b: 52, l: 52 }
      }}
    >
      <Page>
        <Heading level={1}>{data.profile.name}</Heading>
        <ContactLine contacts={data.portfolio.contacts} />
        <Spacer height={SPACING.contactToFirstSection} />

        {experiences.length > 0 && (
          <>
            <Heading level={2}>EXPERIENCE</Heading>
            {experiences.map((exp) => (
              <>
                <Heading level={3}>
                  {exp.organization}, {exp.title}
                </Heading>
                <Text fontSize={9} color={COLORS.secondary}>
                  {formatDateRange(exp.fromDate, exp.toDate, exp.isPresent)}
                </Text>
                <List items={extractBullets(exp.description)} fontSize={9} />
                <Spacer height={SPACING.projectMarginBottom} />
              </>
            ))}
          </>
        )}

        {projects.length > 0 && (
          <>
            <Heading level={2}>PROJECTS</Heading>
            {projects.map((proj) => (
              <>
                <Heading level={3}>{proj.title}</Heading>
                {proj.summary ? <Text fontSize={9}>{stripHtml(proj.summary)}</Text> : null}
                {proj.stacks.length > 0 && (
                  <Text fontSize={9}>Tech Stack: {proj.stacks.map((s) => s.name).join(" • ")}</Text>
                )}
                <Spacer height={SPACING.projectMarginBottom} />
              </>
            ))}
          </>
        )}

        {stacks.length > 0 && (
          <>
            <Heading level={2}>SKILLS</Heading>
            <Text fontSize={9}>{stacks.map((s) => s.name).join(", ")}</Text>
          </>
        )}
      </Page>
    </Document>
  );
}
