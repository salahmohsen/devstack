import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { contactHref, displayContact, parseRenderCvSocial, sortContacts } from "#@/contacts";
import { COVER_LETTER_TYPST_TEMPLATE } from "#@/cover-letter.template";
import { PdfRenderFailedError } from "#@/errors";
import {
  compileTypstUa1,
  PDF_RENDER_TIMEOUT_MS,
  resolveTypstFontEnv,
  rethrowRenderError,
  typstStringLiteral,
  type RenderPdfOptions
} from "#@/spawn";
import { type CoverLetterPdfInput, type PdfContact } from "#@/types";

const CORE_CONTACT_TYPES = new Set(["location", "phone", "email", "website"]);

export type CoverLetterContactItem = {
  type: string;
  label: string;
  href: string | null;
};

/**
 * Split cover letter body into paragraphs (blank-line separated).
 * Falls back to a single paragraph with soft line breaks joined when no blank lines.
 */
export function splitCoverLetterParagraphs(body: string): string[] {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];

  const byBlank = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  if (byBlank.length > 1) return byBlank;

  return [trimmed.replace(/\n+/g, " ").trim()].filter(Boolean);
}

function formatLetterDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/** Name + one contact line: same omit rules as the resume (no Discord / unknown / invalid socials). */
export function buildCoverLetterContactItems(
  contacts: PdfContact[],
  profileEmail: string
): CoverLetterContactItem[] {
  const list = [...contacts];
  const hasEmail = list.some((c) => c.type === "email");
  if (!hasEmail && profileEmail.trim()) {
    list.unshift({ type: "email", value: profileEmail.trim(), sortOrder: -1 });
  }

  const items: CoverLetterContactItem[] = [];
  const seen = new Set<string>();
  for (const contact of sortContacts(list)) {
    const social = parseRenderCvSocial(contact.type, contact.value);
    if (!social && !CORE_CONTACT_TYPES.has(contact.type)) continue;

    const label = displayContact(contact.type, contact.value);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      type: contact.type,
      label,
      href: contactHref(contact.type, contact.value)
    });
  }
  return items;
}

function typstContactLine(items: CoverLetterContactItem[]): string {
  if (items.length === 0) return "[]";
  const parts = items.map((item) => {
    const label = typstStringLiteral(item.label);
    if (!item.href) return label;
    return `link(${typstStringLiteral(item.href)}, ${label})`;
  });
  return `[${parts.map((part) => `#${part}`).join(" | ")}]`;
}

function typstStringArray(values: string[]): string {
  return `(${values.map((value) => `${typstStringLiteral(value)},`).join(" ")})`;
}

export function fillCoverLetterTypst(input: CoverLetterPdfInput): string {
  const paragraphs = splitCoverLetterParagraphs(input.body);
  if (paragraphs.length === 0) {
    throw new PdfRenderFailedError("Cover letter body is empty");
  }

  const name = input.candidateName.trim();
  const company = input.companyName?.trim() ?? "";
  const role = input.roleTitle?.trim() ?? "";
  const contactItems = buildCoverLetterContactItems(input.contacts, input.email);

  const bindings = [
    `#let name = ${typstStringLiteral(name)}`,
    `#let has-contact = ${contactItems.length > 0 ? "true" : "false"}`,
    `#let contact-line = ${typstContactLine(contactItems)}`,
    `#let date-line = ${typstStringLiteral(formatLetterDate(input.date ?? new Date()))}`,
    `#let company = ${typstStringLiteral(company)}`,
    `#let role = ${typstStringLiteral(role)}`,
    `#let paragraphs = ${typstStringArray(paragraphs)}`
  ].join("\n");

  return COVER_LETTER_TYPST_TEMPLATE.replace("{{bindings}}", bindings);
}

export async function renderCoverLetterPdfBytes(
  input: CoverLetterPdfInput,
  options: RenderPdfOptions = {}
): Promise<Uint8Array> {
  const source = fillCoverLetterTypst(input);
  const timeoutMs = options.timeoutMs ?? PDF_RENDER_TIMEOUT_MS;
  const spawnFn = options.spawn ?? spawn;
  const env = resolveTypstFontEnv({ ...process.env, ...options.env });
  const tmp = await mkdtemp(join(tmpdir(), "cover-letter-pdf-"));

  try {
    const typPath = join(tmp, "letter.typ");
    const pdfPath = join(tmp, "letter.pdf");
    await writeFile(typPath, source, "utf8");
    await compileTypstUa1(typPath, pdfPath, {
      cwd: tmp,
      timeoutMs,
      env,
      spawnFn
    });
    const bytes = await readFile(pdfPath);
    return Uint8Array.from(bytes);
  } catch (error) {
    return rethrowRenderError(error);
  } finally {
    try {
      await rm(tmp, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}
