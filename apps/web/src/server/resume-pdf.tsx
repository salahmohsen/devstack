import { Document, Page, Text, Heading, List, Spacer } from "pdfnative-react";

import {
  type ExperienceOutput,
  type ProjectOutput,
  type StackOutput
} from "@tsu-stack/core/portfolio";
import { type ContactSchemaSelect } from "@tsu-stack/db/types";

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

type ContactMap = {
  email: string;
  phone: string;
  location: string;
  website: string;
};

function toContactMap(contacts: ContactSchemaSelect[]): ContactMap {
  const map: ContactMap = { email: "", phone: "", location: "", website: "" };
  for (const c of contacts) {
    if (c.type === "email") map.email = c.value;
    else if (c.type === "phone") map.phone = c.value;
    else if (c.type === "location") map.location = c.value;
    else if (c.type === "website") map.website = c.value;
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

function ContactLine({ contacts }: { contacts: ContactSchemaSelect[] }) {
  const contactMap = toContactMap(contacts);
  const parts: string[] = [];
  if (contactMap.email) parts.push(contactMap.email);
  if (contactMap.phone) parts.push(contactMap.phone);
  if (contactMap.location) parts.push(contactMap.location);
  if (contactMap.website) parts.push(contactMap.website);
  return (
    <Text fontSize={9} color={COLORS.secondary}>
      {parts.join(" · ")}
    </Text>
  );
}

type ResumeData = {
  name: string;
  contacts: ContactSchemaSelect[];
  experiences: ExperienceOutput[];
  projects: ProjectOutput[];
  stacks: StackOutput[];
};

export function ResumeDocument({ data }: { data: ResumeData }) {
  const experiences = data.experiences.filter((e) => e.includedInPortfolio);
  const projects = data.projects.filter((p) => p.includedInPortfolio && !p.isArchived);
  const stacks = data.stacks.filter((s) => s.includedInPortfolio);

  return (
    <Document
      title={`${data.name} - Resume`}
      layout={{
        tagged: true,
        margins: { t: 52, r: 52, b: 52, l: 52 }
      }}
    >
      <Page>
        <Heading level={1}>{data.name}</Heading>
        <ContactLine contacts={data.contacts} />
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
                {exp.projects
                  .filter((p) => !p.isArchived)
                  .map((proj) => (
                    <>
                      <Text fontSize={9}>{proj.title}</Text>
                      {proj.summary ? <Text fontSize={9}>{stripHtml(proj.summary)}</Text> : null}
                      {proj.stacks.length > 0 && (
                        <Text fontSize={9}>
                          Tech Stack: {proj.stacks.map((s) => s.name).join(" • ")}
                        </Text>
                      )}
                    </>
                  ))}
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
