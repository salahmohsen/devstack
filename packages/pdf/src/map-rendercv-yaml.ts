import { stringify } from "yaml";

import {
  isValidRenderCvEmail,
  isValidRenderCvPhone,
  parseRenderCvSocial,
  sortContacts,
  toRenderCvHttpUrl,
  type RenderCvSocial
} from "#@/contacts";
import { resumeHeadline } from "#@/headline";
import { extractBullets, summaryPlainText } from "#@/html";
import { filterPortfolioProjectStacks, groupStacksByType, projectStackNames } from "#@/stacks";
import { type PdfContact, type ResumePdfInput, type ResumePdfPortfolio } from "#@/types";

/** RenderCV dates: YYYY-MM / YYYY from ISO. Do not emit display month names. */
function toRenderCvDate(raw: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  const ymd = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (ymd) return `${ymd[1]}-${ymd[2]}`;
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  return undefined;
}

function collectEmails(contacts: PdfContact[], profileEmail: string): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const value = raw.trim().replace(/^mailto:/i, "");
    if (!isValidRenderCvEmail(value)) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    emails.push(value);
  };
  add(profileEmail);
  for (const contact of contacts) {
    if (contact.type === "email") add(contact.value);
  }
  return emails;
}

function collectPhones(contacts: PdfContact[]): string[] {
  const phones: string[] = [];
  for (const contact of contacts) {
    if (contact.type !== "phone") continue;
    const value = contact.value.trim();
    if (isValidRenderCvPhone(value)) phones.push(value);
  }
  return phones;
}

function collectWebsites(contacts: PdfContact[]): string[] {
  const websites: string[] = [];
  const seen = new Set<string>();
  for (const contact of contacts) {
    if (contact.type !== "website") continue;
    const url = toRenderCvHttpUrl(contact.value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    websites.push(url);
  }
  return websites;
}

function firstLocation(contacts: PdfContact[]): string | undefined {
  for (const contact of contacts) {
    if (contact.type !== "location") continue;
    const value = contact.value.trim();
    if (value) return value;
  }
  return undefined;
}

function collectSocials(contacts: PdfContact[]): RenderCvSocial[] {
  const socials: RenderCvSocial[] = [];
  const seen = new Set<string>();
  for (const contact of contacts) {
    const parsed = parseRenderCvSocial(contact.type, contact.value);
    if (!parsed) continue;
    const key = `${parsed.network}:${parsed.username.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    socials.push(parsed);
  }
  return socials;
}

function scalarOrList(values: string[]): string | string[] {
  return values.length === 1 ? values[0]! : values;
}

function summaryText(input: ResumePdfInput): string | undefined {
  const override = input.professionalSummary?.trim();
  const source = override !== undefined && override !== "" ? override : input.summary;
  const text = summaryPlainText(source).trim();
  return text === "" ? undefined : text;
}

function experienceEntries(experiences: ResumePdfPortfolio["experiences"]) {
  return experiences
    .filter((e) => e.includedInPortfolio)
    .map((exp) => {
      const rewritten = (exp.bullets ?? []).map((b) => b.trim()).filter(Boolean);
      const highlights = rewritten.length > 0 ? rewritten : extractBullets(exp.description);
      const entry: Record<string, unknown> = {
        company: exp.organization,
        position: exp.title
      };
      const start = toRenderCvDate(exp.fromDate);
      const end = exp.isPresent ? "present" : toRenderCvDate(exp.toDate);
      if (start) entry.start_date = start;
      if (end) entry.end_date = end;
      if (highlights.length > 0) entry.highlights = highlights;
      return entry;
    });
}

function projectDemoHttpUrl(proj: ResumePdfPortfolio["projects"][number]): string | null {
  return proj.demoUrl?.trim() ? toRenderCvHttpUrl(proj.demoUrl) : null;
}

/** engineeringresumes puts markdown links on the title line (link + external icon). */
function projectHeadingName(title: string, url: string | null): string {
  if (!url) return title;
  if (/[[\]]/.test(title)) return title;
  return `[${title}](${url})`;
}

function projectEntries(
  projects: ResumePdfPortfolio["projects"],
  stacks: ResumePdfPortfolio["stacks"]
) {
  const includedStacks = stacks.filter((s) => s.includedInPortfolio);
  return projects
    .filter((p) => p.includedInPortfolio && !p.isArchived)
    .map((proj) => {
      const rewritten = (proj.bullets ?? []).map((b) => b.trim()).filter(Boolean);
      const fromDescription =
        rewritten.length === 0 && proj.description?.trim() ? extractBullets(proj.description) : [];
      const fromSummary =
        rewritten.length === 0 && fromDescription.length === 0 && proj.summary?.trim()
          ? extractBullets(proj.summary)
          : [];
      const highlights =
        rewritten.length > 0
          ? rewritten
          : fromDescription.length > 0
            ? fromDescription
            : fromSummary;

      const techNames = projectStackNames(
        filterPortfolioProjectStacks(proj.stacks ?? [], includedStacks)
      );
      if (techNames.length > 0) {
        highlights.push(`Stack: ${techNames.join(" · ")}`);
      }

      const url = projectDemoHttpUrl(proj);
      const entry: Record<string, unknown> = { name: projectHeadingName(proj.title, url) };
      if (url && /[[\]]/.test(proj.title)) entry.location = url;
      if (highlights.length > 0) entry.highlights = highlights;
      return entry;
    });
}

function skillEntries(stacks: ResumePdfPortfolio["stacks"]) {
  const included = stacks.filter((s) => s.includedInPortfolio);
  return groupStacksByType(included).map((group) => {
    return {
      label: group.label,
      details: group.names.join(", ")
    };
  });
}

const SOCIAL_TYPES = new Set([
  "linkedin",
  "github",
  "x",
  "youtube",
  "instagram",
  "telegram",
  "bluesky",
  "mastodon"
]);

function contactsForOrder(contacts: PdfContact[], profileEmail: string): PdfContact[] {
  const list = [...contacts];
  const hasEmail = list.some((c) => c.type === "email");
  if (!hasEmail && isValidRenderCvEmail(profileEmail)) {
    list.unshift({ type: "email", value: profileEmail.trim(), sortOrder: -1 });
  }
  return sortContacts(list);
}

function buildCv(input: ResumePdfInput): Record<string, unknown> {
  const cv: Record<string, unknown> = { name: input.profile.name };
  const headline = [input.headline?.trim(), resumeHeadline(input.portfolio.experiences)].find(
    (value) => Boolean(value)
  );
  if (headline) cv.headline = headline;

  const ordered = contactsForOrder(input.portfolio.contacts, input.profile.email);
  const emails = collectEmails(input.portfolio.contacts, input.profile.email);
  const phones = collectPhones(ordered);
  const websites = collectWebsites(ordered);
  const location = firstLocation(ordered);
  const socials = collectSocials(ordered);

  const assignContactFields = (type: string) => {
    if (type === "email" && !("email" in cv) && emails.length > 0) {
      cv.email = scalarOrList(emails);
    } else if (type === "phone" && !("phone" in cv) && phones.length > 0) {
      cv.phone = scalarOrList(phones);
    } else if (type === "website" && !("website" in cv) && websites.length > 0) {
      cv.website = scalarOrList(websites);
    } else if (type === "location" && !("location" in cv) && location) {
      cv.location = location;
    } else if (SOCIAL_TYPES.has(type) && !("social_networks" in cv) && socials.length > 0) {
      cv.social_networks = socials;
    }
  };

  for (const contact of ordered) assignContactFields(contact.type);

  if (!("email" in cv) && emails.length > 0) cv.email = scalarOrList(emails);
  if (!("phone" in cv) && phones.length > 0) cv.phone = scalarOrList(phones);
  if (!("website" in cv) && websites.length > 0) cv.website = scalarOrList(websites);
  if (!("location" in cv) && location) cv.location = location;
  if (!("social_networks" in cv) && socials.length > 0) cv.social_networks = socials;

  const sections: Record<string, unknown> = {};
  const summary = summaryText(input);
  if (summary) sections.summary = [summary];

  const experience = experienceEntries(input.portfolio.experiences);
  if (experience.length > 0) sections.experience = experience;

  const projects = projectEntries(input.portfolio.projects, input.portfolio.stacks);
  if (projects.length > 0) sections.projects = projects;

  const skills = skillEntries(input.portfolio.stacks);
  if (skills.length > 0) sections.skills = skills;

  if (Object.keys(sections).length > 0) cv.sections = sections;
  return cv;
}

export function toRenderCvYaml(input: ResumePdfInput): string {
  const doc = {
    cv: buildCv(input),
    design: {
      theme: "engineeringresumes",
      page: { size: "a4" }
    },
    locale: { language: "english" }
  };
  return stringify(doc, { lineWidth: 0, aliasDuplicateObjects: false });
}
