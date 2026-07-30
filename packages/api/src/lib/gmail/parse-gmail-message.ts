import { mailPreviewFromBody, parseEmailAddress } from "@tsu-stack/core";

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: GmailHeader[];
};

export type GmailMessageResource = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
};

export type ParsedGmailMessage = {
  providerMessageId: string;
  fromName: string;
  fromEmail: string;
  toEmail: string | null;
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
};

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  const hit = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return hit?.value?.trim() ?? "";
}

function decodeBase64Url(data: string | undefined): string {
  if (!data) return "";
  try {
    const normalized = data.replaceAll("-", "+").replaceAll("_", "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function collectBodies(part: GmailPart | undefined, acc: { text: string; html: string }) {
  if (!part) return;
  // Gmail uses `text/html; charset=UTF-8` — match by prefix, not exact equality.
  const mime = (part.mimeType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "text/plain" && part.body?.data) {
    acc.text += decodeBase64Url(part.body.data);
  }
  if (mime === "text/html" && part.body?.data) {
    acc.html += decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    collectBodies(child, acc);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGmailMessage(resource: GmailMessageResource): ParsedGmailMessage | null {
  const id = resource.id?.trim();
  if (!id) return null;

  const headers = resource.payload?.headers ?? [];
  const fromRaw = headerValue(headers, "From");
  const toRaw = headerValue(headers, "To");
  const subject = headerValue(headers, "Subject");
  const from = parseEmailAddress(fromRaw || "unknown@invalid");
  const to = toRaw ? parseEmailAddress(toRaw) : null;

  const bodies = { text: "", html: "" };
  collectBodies(resource.payload, bodies);

  let bodyText = bodies.text.trim();
  const bodyHtml = bodies.html.trim() ? bodies.html : null;
  if (!bodyText && bodyHtml) bodyText = stripHtml(bodyHtml);
  if (!bodyText && resource.snippet) bodyText = resource.snippet.trim();

  const previewSource =
    mailPreviewFromBody(bodyText) ||
    mailPreviewFromBody(resource.snippet ?? "") ||
    mailPreviewFromBody(subject) ||
    "(no preview)";

  const internalMs = resource.internalDate ? Number(resource.internalDate) : NaN;
  const receivedAt = Number.isFinite(internalMs) ? new Date(internalMs) : new Date();

  return {
    providerMessageId: id,
    fromName: from.name,
    fromEmail: from.email,
    toEmail: to?.email ?? null,
    subject,
    preview: previewSource,
    bodyText,
    bodyHtml,
    receivedAt
  };
}
