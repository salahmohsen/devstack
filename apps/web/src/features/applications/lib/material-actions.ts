import { type ApplicationOutput } from "@tsu-stack/core";

export type ApplicationMaterialKind = "resume" | "cover-letter" | "outreach";

export type MaterialActionId = "preview" | "download" | "copy";

export type MaterialDescriptor = {
  kind: ApplicationMaterialKind;
  label: string;
  /** Short card meta from spec. */
  meta: string;
};

export type MaterialAction = {
  id: MaterialActionId;
  label: string;
};

export function materialsFor(app: ApplicationOutput): MaterialDescriptor[] {
  const items: MaterialDescriptor[] = [];
  if (app.resumeId) {
    items.push({ kind: "resume", label: "Resume", meta: "PDF" });
  }
  if (app.coverLetterR2Key || app.coverLetterBody?.trim()) {
    const hasPdf = Boolean(app.coverLetterR2Key);
    const hasBody = Boolean(app.coverLetterBody?.trim());
    const meta = hasPdf && hasBody ? "PDF + text" : hasPdf ? "PDF" : "Text";
    items.push({ kind: "cover-letter", label: "Cover letter", meta });
  }
  if (app.outreachSubject?.trim() || app.outreachBody?.trim()) {
    items.push({ kind: "outreach", label: "Outreach email", meta: "Subject + body" });
  }
  return items;
}

export function actionsFor(
  kind: ApplicationMaterialKind,
  app: ApplicationOutput
): MaterialAction[] {
  if (kind === "resume") {
    return [
      { id: "preview", label: "Preview" },
      { id: "download", label: "Download" }
    ];
  }
  if (kind === "cover-letter") {
    const actions: MaterialAction[] = [{ id: "preview", label: "Preview" }];
    if (app.coverLetterR2Key) actions.push({ id: "download", label: "Download" });
    if (app.coverLetterBody?.trim()) actions.push({ id: "copy", label: "Copy" });
    return actions;
  }
  // outreach
  return [
    { id: "preview", label: "Preview" },
    { id: "copy", label: "Copy" }
  ];
}

/** Cover letter body only — never PDF header meta. */
export function formatCoverLetterCopy(app: ApplicationOutput): string | null {
  const body = app.coverLetterBody?.trim();
  if (!body) return null;
  return body;
}

/** Full email for paste: Subject line + blank line + body. */
export function formatOutreachCopy(app: ApplicationOutput): string | null {
  const subject = app.outreachSubject?.trim() ?? "";
  const body = app.outreachBody?.trim() ?? "";
  if (!subject && !body) return null;
  return `Subject: ${subject || "(no subject)"}\n\n${body}`;
}

/** Clipboard only — UI owns toast. Always ship this in Task 1. */
export async function writeClipboardText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
